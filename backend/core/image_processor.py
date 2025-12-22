# backend/core/image_processor.py
import numpy as np
import cv2
from typing import Literal, List, Dict
from .interfaces import IImageEncoder, IMixerService

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
            self.original = np.zeros(shape, dtype=np.uint8)
            
        self.shape = self.original.shape
        
        # Calculate FFT
        fft_full = np.fft.fft2(self.original)
        self.fft_shifted = np.fft.fftshift(fft_full)
        
        self._magnitude = np.abs(self.fft_shifted)
        self._phase = np.angle(self.fft_shifted)
        self._real = np.real(self.fft_shifted)
        self._imag = np.imag(self.fft_shifted)

    @property
    def magnitude(self) -> np.ndarray:
        """Raw magnitude spectrum (non-negative float array)."""
        return self._magnitude

    @property
    def magnitude_db(self) -> np.ndarray:
        """Log-magnitude in decibels (20 * log10(magnitude + 1e-9))."""
        return 20 * np.log10(self._magnitude + 1e-9)

    @property
    def phase(self) -> np.ndarray:
        return self._phase

    @property
    def real(self) -> np.ndarray:
        return self._real

    @property
    def imag(self) -> np.ndarray:
        return self._imag

    def get_component_data(self, type_str: str) -> np.ndarray:
        if type_str == 'Magnitude':
            return self.magnitude_db
        elif type_str == 'Phase':
            return self.phase
        elif type_str == 'Real':
            return self.real
        elif type_str == 'Imaginary':
            return self.imag
        else:
            return self.original


class PNGEncoder(IImageEncoder):
    """
    Concrete implementation of IImageEncoder for PNG format.
    Replaces the old static ImagePresenter.
    """
    def encode(self, data: np.ndarray) -> bytes:
        clean_data = np.nan_to_num(data, nan=0.0, posinf=0.0, neginf=0.0)
        
        # Normalize if not already uint8
        if clean_data.dtype != np.uint8:
            norm = cv2.normalize(clean_data, None, 0, 255, cv2.NORM_MINMAX)
            final_img = np.uint8(norm)
        else:
            final_img = clean_data
            
        success, buffer = cv2.imencode('.png', final_img)
        if not success:
            raise ValueError("Could not encode image to PNG")
        return buffer.tobytes()


class MixerService(IMixerService):
    """
    Service class encapsulating the business logic for image mixing.
    """
    def mix_images_per_type(self, 
                            images: list['ImageModel'], 
                            weights: list[dict],
                            region_types: list[str],
                            region_width: float,
                            region_height: float,
                            region_x: float,
                            region_y: float,
                            mode: str) -> np.ndarray:
        
        if not images:
            raise ValueError("No images provided")

        shape = images[0].shape
        
        masks = [
            self._create_mask(
                shape, 
                region_types[i] if i < len(region_types) else 'inner',
                region_width, 
                region_height, 
                region_x, 
                region_y
            )
            for i in range(len(images))
        ]
        
        if mode == 'mag-phase':
            result_fft = self._mix_mag_phase_with_masks(images, weights, masks)
        elif mode == 'real-imag':
            result_fft = self._mix_real_imag_with_masks(images, weights, masks)
        else:
            raise ValueError("Invalid mix mode")

        fft_unshifted = np.fft.ifftshift(result_fft)
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

    def _mix_mag_phase_with_masks(self, images, weights, masks):
        mixed_mag = np.zeros_like(images[0].magnitude)
        mixed_phase = np.zeros_like(images[0].phase)

        for i, img in enumerate(images):
            if i < len(weights) and i < len(masks):
                w_mag = weights[i].get('magnitude', 0.0)
                w_phase = weights[i].get('phase', 0.0)
                
                mixed_mag += (img.magnitude * w_mag) * masks[i]
                mixed_phase += (img.phase * w_phase) * masks[i]
        
        return mixed_mag * np.exp(1j * mixed_phase)

    def _mix_real_imag_with_masks(self, images, weights, masks):
        mixed_real = np.zeros_like(images[0].real)
        mixed_imag = np.zeros_like(images[0].imag)

        for i, img in enumerate(images):
            if i < len(weights) and i < len(masks):
                w_real = weights[i].get('real', 0.0)
                w_imag = weights[i].get('imag', 0.0)
                
                mixed_real += (img.real * w_real) * masks[i]
                mixed_imag += (img.imag * w_imag) * masks[i]

        return mixed_real + 1j * mixed_imag