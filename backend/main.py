# backend/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import matplotlib

matplotlib.use('Agg')

from core.image_processor import ImageModel, MixerService, ImagePresenter
from core.beamformer import PhasedArray, BeamSystem

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependency Injection & State Management ---

class ImageRepository:
    """Encapsulates in-memory storage."""
    def __init__(self):
        self._storage = {}
        self._capacity = 4

    def save(self, slot_id: int, image: ImageModel):
        if not (0 <= slot_id < self._capacity):
            raise ValueError(f"Slot ID must be 0-{self._capacity-1}")
        self._storage[slot_id] = image

    def get(self, slot_id: int) -> ImageModel:
        return self._storage.get(slot_id, ImageModel())

    def get_all(self):
        return [self.get(i) for i in range(self._capacity)]

repo = ImageRepository()
mixer_service = MixerService()

# --- Pydantic Models ---
class ComponentRequest(BaseModel):
    id: int
    type_str: str

class MixRequest(BaseModel):
    weights: list[dict]
    region_types: list[str]  # UPDATED: Now an array of 4 types
    region_width: float
    region_height: float
    region_x: float
    region_y: float
    mix_mode: str = 'mag-phase'

class BeamRequest(BaseModel):
    arrays: list[dict]
    resolution: int = 300 

# --- Helpers ---
def to_base64_response(img_bytes: bytes, key: str):
    b64 = base64.b64encode(img_bytes).decode()
    return {key: f"data:image/png;base64,{b64}"}

# --- Endpoints ---

@app.post("/upload/{img_id}")
async def upload_image(img_id: int, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = ImageModel(contents)
        repo.save(img_id, image)
        return {"status": "success", "shape": image.shape}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_component")
async def get_component_view(req: ComponentRequest):
    try:
        image = repo.get(req.id)
        raw_data = image.get_component_data(req.type_str)
        img_bytes = ImagePresenter.encode_to_bytes(raw_data)
        return to_base64_response(img_bytes, "image")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process_mix")
async def mix_request(data: MixRequest):
    try:
        images = repo.get_all()
        
        # UPDATED: Pass each image's region type separately
        result_data = mixer_service.mix_images_per_type(
            images=images,
            weights=data.weights,
            region_types=data.region_types,
            region_width=data.region_width,
            region_height=data.region_height,
            region_x=data.region_x,
            region_y=data.region_y,
            mode=data.mix_mode
        )
        
        img_bytes = ImagePresenter.encode_to_bytes(result_data)
        return to_base64_response(img_bytes, "image")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- BEAMFORMING ENDPOINTS ---

@app.post("/simulate_beam")
async def beam_request(config: BeamRequest):
    try:
        system = BeamSystem(resolution=config.resolution)
        
        for arr_cfg in config.arrays:
            array = PhasedArray(
                num_elements=arr_cfg['count'],
                geometry=arr_cfg['geo'],
                curvature=arr_cfg.get('curve', 0) / 500.0,
                position=(arr_cfg.get('x', 0.0), arr_cfg.get('y', 0.0)),
                spacing_factor=arr_cfg.get('spacing', 0.5)
            )
            
            array.set_steering(arr_cfg['steering'])
            
            if 'antennaOffsets' in arr_cfg:
                array.apply_offsets(arr_cfg['antennaOffsets'])
                
            system.add_array(array)

        system.simulate()
        img_bytes = system.render_heatmap()
        return to_base64_response(img_bytes, "map")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_beam_profile")
async def get_beam_profile(config: BeamRequest):
    try:
        if not config.arrays:
            raise ValueError("No arrays provided")
        
        arr_cfg = config.arrays[0]
        
        array = PhasedArray(
            num_elements=arr_cfg['count'],
            geometry=arr_cfg['geo'],
            curvature=arr_cfg.get('curve', 0) / 500.0,
            spacing_factor=arr_cfg.get('spacing', 0.5)
        )
        
        array.set_steering(arr_cfg['steering'])
        
        if 'antennaOffsets' in arr_cfg:
            array.apply_offsets(arr_cfg['antennaOffsets'])
            
        img_bytes = array.render_polar_plot()
        return to_base64_response(img_bytes, "profile")
        
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))