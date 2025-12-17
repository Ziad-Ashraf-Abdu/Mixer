# backend/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import matplotlib
import sys

# Configure matplotlib backend to avoid GUI errors
matplotlib.use('Agg')

# --- Local Imports ---
from core.interfaces import IImageRepository, IImageEncoder, IMixerService
from core.image_processor import ImageModel, MixerService, PNGEncoder
from core.storage import InMemoryImageRepository
from core.beamformer import PhasedArray, BeamSystem

# --- DI Container ---
class AppContainer:
    """
    Simple Dependency Injection Container.
    Initializes singletons for the application.
    """
    def __init__(self):
        self.image_repository = InMemoryImageRepository(capacity=4)
        self.mixer_service = MixerService()
        self.encoder = PNGEncoder()

# Instantiate container
container = AppContainer()

# --- Dependency Providers ---
def get_repository() -> IImageRepository:
    return container.image_repository

def get_mixer_service() -> IMixerService:
    return container.mixer_service

def get_encoder() -> IImageEncoder:
    return container.encoder

# --- FastAPI Setup ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class ComponentRequest(BaseModel):
    id: int
    type_str: str

class MixRequest(BaseModel):
    weights: list[dict]
    region_types: list[str]
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
async def upload_image(
    img_id: int, 
    file: UploadFile = File(...),
    repo: IImageRepository = Depends(get_repository)
):
    try:
        contents = await file.read()
        image = ImageModel(contents)
        repo.save(img_id, image)
        return {"status": "success", "shape": image.shape}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_component")
async def get_component_view(
    req: ComponentRequest,
    repo: IImageRepository = Depends(get_repository),
    encoder: IImageEncoder = Depends(get_encoder)
):
    try:
        image = repo.get(req.id)
        raw_data = image.get_component_data(req.type_str)
        
        img_bytes = encoder.encode(raw_data)
        
        return to_base64_response(img_bytes, "image")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process_mix")
async def mix_request(
    data: MixRequest,
    repo: IImageRepository = Depends(get_repository),
    mixer: IMixerService = Depends(get_mixer_service),
    encoder: IImageEncoder = Depends(get_encoder)
):
    try:
        images = repo.get_all()
        
        result_data = mixer.mix_images_per_type(
            images=images,
            weights=data.weights,
            region_types=data.region_types,
            region_width=data.region_width,
            region_height=data.region_height,
            region_x=data.region_x,
            region_y=data.region_y,
            mode=data.mix_mode
        )
        
        img_bytes = encoder.encode(result_data)
        
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
            
            # NEW: Apply individual frequency multipliers
            if 'antennaFrequencies' in arr_cfg:
                array.set_frequency_multipliers(arr_cfg['antennaFrequencies'])
                
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
            
        # NEW: Apply individual frequency multipliers
        if 'antennaFrequencies' in arr_cfg:
            array.set_frequency_multipliers(arr_cfg['antennaFrequencies'])
            
        img_bytes = array.render_polar_plot()
        return to_base64_response(img_bytes, "profile")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))