# main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from core.image_processor import ImageModel, MixerEngine
from core.beamformer import PhasedArray
import numpy as np
import base64
import cv2

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-Memory Storage ---
uploaded_images = {}  # {0: ImageModel, 1: ..., 3: ...}

# --- Pydantic Models ---
class ComponentRequest(BaseModel):
    id: int
    type_str: str

class MixRequest(BaseModel):
    weights: list[dict]
    region_type: str
    region_width: float
    region_height: float
    region_x: float # Center X (0-1)
    region_y: float # Center Y (0-1)
    mix_mode: str = 'mag-phase'

class BeamRequest(BaseModel):
    arrays: list[dict]
    resolution: int = 100

# --- Helper: Create blank image ---
def _create_blank_image_model():
    blank = np.zeros((256, 256), dtype=np.uint8)
    _, buf = cv2.imencode('.png', blank)
    return ImageModel(buf.tobytes())

# --- Endpoints ---
@app.post("/upload/{img_id}")
async def upload_image(img_id: int, file: UploadFile = File(...)):
    if img_id not in [0, 1, 2, 3]:
        raise HTTPException(status_code=400, detail="img_id must be 0-3")
    try:
        contents = await file.read()
        img_model = ImageModel(contents)
        uploaded_images[img_id] = img_model
        return {"status": "success", "shape": img_model.shape}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_component")
async def get_component_view(req: ComponentRequest):
    if req.id not in [0, 1, 2, 3]:
        raise HTTPException(status_code=400, detail="id must be 0-3")
    img_model = uploaded_images.get(req.id)
    if img_model is None:
        img_model = _create_blank_image_model()
    
    raw_data = img_model.get_component(req.type_str)
    raw_data = np.nan_to_num(raw_data, nan=0.0, posinf=0.0, neginf=0.0)
    
    if raw_data.dtype != np.uint8:
        norm = cv2.normalize(raw_data, None, 0, 255, cv2.NORM_MINMAX)
        disp_img = np.uint8(norm)
    else:
        disp_img = raw_data

    _, buffer = cv2.imencode('.png', disp_img)
    b64 = base64.b64encode(buffer).decode()
    return {"image": f"data:image/png;base64,{b64}"}

@app.post("/process_mix")
async def mix_request(data: MixRequest):
    try:
        images = []
        for i in range(4):
            images.append(uploaded_images.get(i, _create_blank_image_model()))

        result = MixerEngine.mix_images(
            images=images,
            weights=data.weights,
            region_type=data.region_type,
            region_width=data.region_width,
            region_height=data.region_height,
            region_x=data.region_x,
            region_y=data.region_y,
            mix_mode=data.mix_mode
        )

        norm_res = cv2.normalize(result, None, 0, 255, cv2.NORM_MINMAX)
        _, buffer = cv2.imencode('.png', np.uint8(norm_res))
        b64 = base64.b64encode(buffer).decode()
        return {"image": f"data:image/png;base64,{b64}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulate_beam")
async def beam_request(config: BeamRequest):
    try:
        res = config.resolution
        x = np.linspace(-10, 10, res)
        y = np.linspace(0, 20, res)
        X, Y = np.meshgrid(x, y)

        total_field = np.zeros_like(X, dtype=np.complex128)

        for arr_cfg in config.arrays:
            array = PhasedArray(
                num_elements=arr_cfg['count'],
                geometry=arr_cfg['geo'],
                curvature=arr_cfg.get('curve', 0),
                position=(arr_cfg.get('x', 0.0), arr_cfg.get('y', 0.0))
            )
            field = array.calculate_interference_map(
                steering_angle_deg=arr_cfg['steering'],
                grid_x=X,
                grid_y=Y
            )
            total_field += field

        magnitude = np.abs(total_field)
        norm = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX)
        colored = cv2.applyColorMap(np.uint8(norm), cv2.COLORMAP_JET)
        
        _, buffer = cv2.imencode('.png', colored)
        b64 = base64.b64encode(buffer).decode()
        return {"map": f"data:image/png;base64,{b64}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_beam_profile")
async def get_beam_profile(config: BeamRequest):
    try:
        if not config.arrays:
            raise ValueError("No arrays provided")
        arr = config.arrays[0]
        angles = np.linspace(-90, 90, 181)
        af_angles, af_power = PhasedArray.compute_array_factor(
            num_elements=arr['count'],
            steering_angle_deg=arr['steering'],
            test_angles_deg=angles,
            geometry=arr['geo'],
            curvature=arr.get('curve', 0)
        )
        power_norm = (af_power - af_power.min()) / (af_power.max() - af_power.min() + 1e-9)
        plot_data = (255 * (1 - power_norm)).astype(np.uint8)

        plot_img = np.tile(plot_data[:, None], (1, 100)).T
        _, buffer = cv2.imencode('.png', plot_img)
        b64 = base64.b64encode(buffer).decode()
        return {"profile": f"data:image/png;base64,{b64}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))