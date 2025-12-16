# backend/core/image_processor.py
import numpy as np
import cv2
from typing import Literal

class ImageModel:
    """
    Domain Entity representing an image and its frequency domain data.
    """
    def __init__(self, file_bytes: bytes = None, shape: tuple = (256, 256)):
        if file_bytes:
            nparr = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            if img is None:
                raise ValueError("Invalid image file")
            self.original = cv2.resize(img, shape)
        else:
            # Create blank if no bytes provided
            self.original = np.zeros(shape, dtype=np.uint8)
            
        self.shape = self.original.shape
        
        # FFT Computation
        fft_full = np.fft.fft2(self.original)
        self.fft_shifted = np.fft.fftshift(fft_full)
        
        # Components
        self.magnitude = np.abs(self.fft_shifted)
        self.phase = np.angle(self.fft_shifted)
        self.real = np.real(self.fft_shifted)
        self.imag = np.imag(self.fft_shifted)

    def get_component_data(self, type_str: str) -> np.ndarray:
        if type_str == 'Magnitude':
            return 20 * np.log(self.magnitude + 1e-9)
        elif type_str == 'Phase':
            return self.phase
        elif type_str == 'Real':
            return self.real
        elif type_str == 'Imaginary':
            return self.imag
        else:
            return self.original

class ImagePresenter:
    """
    View Logic: Handles normalization and encoding of image data for the API.
    Separates the data (ImageModel) from how it's viewed.
    """
    @staticmethod
    def encode_to_bytes(data: np.ndarray) -> bytes:
        # Handle non-finite numbers
        clean_data = np.nan_to_num(data, nan=0.0, posinf=0.0, neginf=0.0)
        
        # Normalize if not uint8
        if clean_data.dtype != np.uint8:
            norm = cv2.normalize(clean_data, None, 0, 255, cv2.NORM_MINMAX)
            final_img = np.uint8(norm)
        else:
            final_img = clean_data
            
        _, buffer = cv2.imencode('.png', final_img)
        return buffer.tobytes()

class MixerService:
    """
    Service class encapsulating the business logic for image mixing.
    """
    def mix_images(self, 
                   images: list[ImageModel], 
                   weights: list[dict], 
                   region_config: dict,
                   mode: str) -> np.ndarray:
        
        if not images:
            raise ValueError("No images provided")

        shape = images[0].shape
        mask = self._create_mask(shape, **region_config)
        
        if mode == 'mag-phase':
            result_fft = self._mix_mag_phase(images, weights)
        elif mode == 'real-imag':
            result_fft = self._mix_real_imag(images, weights)
        else:
            raise ValueError("Invalid mix mode")

        # Apply Region Mask
        mixed_fft_masked = result_fft * mask
        
        # Inverse FFT
        fft_unshifted = np.fft.ifftshift(mixed_fft_masked)
        reconstructed = np.fft.ifft2(fft_unshifted)
        return np.abs(reconstructed)

    def _create_mask(self, shape, region_type, width_pct, height_pct, x_pct, y_pct):
        h, w = shape
        center_x = int(x_pct * w)
        center_y = int(y_pct * h)
        r_w = int((width_pct * w) / 2)
        r_h = int((height_pct * h) / 2)

        Y, X = np.ogrid[:h, :w]
        mask_indices = (np.abs(X - center_x) <= r_w) & (np.abs(Y - center_y) <= r_h)

        if region_type == 'inner':
            return mask_indices.astype(np.float32)
        return (~mask_indices).astype(np.float32)

    def _mix_mag_phase(self, images, weights):
        mixed_mag = np.zeros_like(images[0].magnitude)
        mixed_phase = np.zeros_like(images[0].phase)

        for i, img in enumerate(images):
            if i < len(weights):
                w_mag = weights[i].get('magnitude', 0.0)
                w_phase = weights[i].get('phase', 0.0)
                mixed_mag += img.magnitude * w_mag
                mixed_phase += img.phase * w_phase
        
        return mixed_mag * np.exp(1j * mixed_phase)

    def _mix_real_imag(self, images, weights):
        mixed_real = np.zeros_like(images[0].real)
        mixed_imag = np.zeros_like(images[0].imag)

        for i, img in enumerate(images):
            if i < len(weights):
                w_real = weights[i].get('real', 0.0)
                w_imag = weights[i].get('imag', 0.0)
                mixed_real += img.real * w_real
                mixed_imag += img.imag * w_imag

        return mixed_real + 1j * mixed_imag