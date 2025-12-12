from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from core.image_processor import ImageModel, MixerEngine
from core.beamformer import PhasedArray
import numpy as np
import base64
import cv2
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-Memory Storage ---
uploaded_images = {} # {id: ImageModel}

# --- Pydantic Models for Request Bodies ---
class ComponentRequest(BaseModel):
    id: int
    type_str: str

class MixRequest(BaseModel):
    weights: list[dict] # [{'magnitude': 0.5, 'phase': 0.1}, ...]
    region_type: str    # 'inner' or 'outer'
    region_size: float  # 0.0 to 1.0

class BeamRequest(BaseModel):
    count: int
    geo: str
    curve: int
    steering: float
    scenario: str

# --- Endpoints ---

@app.post("/upload/{img_id}")
async def upload_image(img_id: int, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        # Create ImageModel (Force resize to 256x256 for this task to ensure uniformity)
        img_model = ImageModel(contents, target_size=(256, 256))
        uploaded_images[img_id] = img_model
        return {"status": "success", "shape": img_model.shape}
    except Exception as e:
        print(f"Error uploading: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_component")
async def get_component_view(req: ComponentRequest):
    """
    Returns a visual representation (PNG base64) of a specific FT component.
    """
    if req.id not in uploaded_images:
        raise HTTPException(status_code=404, detail="Image not found")
    
    img_model = uploaded_images[req.id]
    
    # 1. Get raw data (Magnitude, Phase, etc.)
    raw_data = img_model.get_component(req.type_str)
    
    # 2. Normalize to 0-255 for display
    # (Log scale is already applied in get_component for Mag/Real/Imag)
    if raw_data is None:
         raise HTTPException(status_code=500, detail="Processing failed")

    # Handle NaN/Inf
    raw_data = np.nan_to_num(raw_data)
    
    # Normalize min-max to 0-255
    min_val = np.min(raw_data)
    max_val = np.max(raw_data)
    
    if max_val - min_val == 0:
        norm_img = np.zeros_like(raw_data, dtype=np.uint8)
    else:
        norm_img = cv2.normalize(raw_data, None, 0, 255, cv2.NORM_MINMAX)
        norm_img = np.uint8(norm_img)

    # 3. Encode to PNG -> Base64
    _, buffer = cv2.imencode('.png', norm_img)
    b64_str = base64.b64encode(buffer).decode('utf-8')
    
    return {"image": f"data:image/png;base64,{b64_str}"}

@app.post("/process_mix")
async def mix_request(data: MixRequest):
    try:
        # 1. Generate Region Mask
        size = 256
        mask = np.zeros((size, size))
        cx, cy = size//2, size//2
        r_size = int(data.region_size * (size/2)) 
        
        # Ensure radius is at least 1
        r_size = max(1, r_size)
        
        if data.region_type == 'inner':
            # Low frequencies (center)
            mask[cy-r_size:cy+r_size, cx-r_size:cx+r_size] = 1
        else:
            # High frequencies (outer)
            mask = np.ones((size, size))
            mask[cy-r_size:cy+r_size, cx-r_size:cx+r_size] = 0
            
        # 2. Get Valid Images
        # We need to filter out slots that haven't been uploaded yet
        imgs = []
        valid_weights = []
        
        for i in range(4):
            if i in uploaded_images:
                imgs.append(uploaded_images[i])
                valid_weights.append(data.weights[i])
            else:
                # If image missing, we can treat it as zero-energy or skip
                # For simplicity, we skip, but indices must align. 
                # Better approach: pass blank image. 
                pass

        if not imgs: 
             return {"error": "No images uploaded"}
        
        # 3. Mix
        # Note: We need to pass the weights corresponding to existing images
        # But for this specific task, we usually assume 4 slots. 
        # Let's handle the case where user only uploaded Image 0 and 1.
        
        # Create a temporary list of 4 images (blanks if missing) to match weights indices
        full_imgs = []
        for i in range(4):
            if i in uploaded_images:
                full_imgs.append(uploaded_images[i])
            else:
                # Create a dummy blank image model
                blank = np.zeros((256, 256), dtype=np.uint8)
                dummy = ImageModel(cv2.imencode('.png', blank)[1].tobytes())
                full_imgs.append(dummy)

        result = MixerEngine.mix_images(full_imgs, data.weights, mask)
        
        # 4. Encode result
        norm_res = cv2.normalize(result, None, 0, 255, cv2.NORM_MINMAX)
        _, buffer = cv2.imencode('.png', np.uint8(norm_res))
        b64_str = base64.b64encode(buffer).decode('utf-8')
        return {"image": f"data:image/png;base64,{b64_str}"}

    except Exception as e:
        print(f"Mixing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulate_beam")
async def beam_request(config: BeamRequest):
    try:
        array = PhasedArray(
            num_elements=config.count, 
            geometry=config.geo, 
            curvature=config.curve
        )
        field = array.calculate_interference_map(config.steering)
        
        # Normalize for visualization (0-255)
        # Use a colormap for better visualization (Hot/Jet)
        norm = cv2.normalize(field, None, 0, 255, cv2.NORM_MINMAX)
        norm = np.uint8(norm)
        
        # Apply colormap
        colored = cv2.applyColorMap(norm, cv2.COLORMAP_JET)
        
        _, buffer = cv2.imencode('.png', colored)
        b64_str = base64.b64encode(buffer).decode('utf-8')
        return {"map": f"data:image/png;base64,{b64_str}"}
        
    except Exception as e:
        print(f"Beam error: {e}")
        raise HTTPException(status_code=500, detail=str(e))