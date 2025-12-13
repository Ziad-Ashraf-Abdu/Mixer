import numpy as np
import cv2
from typing import Literal

class ImageModel:
    def __init__(self, file_bytes: bytes, target_size: tuple = (256, 256)):
        # Decode and convert to grayscale
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError("Invalid image file")
        
        # Resize to target (ensures uniformity)
        self.original = cv2.resize(img, target_size)
        self.shape = self.original.shape

        # Compute FFT (shifted for centering low frequencies)
        fft_full = np.fft.fft2(self.original)
        self.fft_shifted = np.fft.fftshift(fft_full)

        # Extract components
        self.magnitude = np.abs(self.fft_shifted)
        self.phase = np.angle(self.fft_shifted)
        self.real = np.real(self.fft_shifted)
        self.imag = np.imag(self.fft_shifted)

    def get_component(self, type_str: str):
        """Return log-scaled or raw component for visualization."""
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

    def get_complex_fft(self):
        """Return the full complex FFT (shifted)."""
        return self.fft_shifted.copy()


class MixerEngine:
    @staticmethod
    def create_region_mask(shape, region_type: str, width_pct: float, height_pct: float, x_pct: float, y_pct: float):
        """
        Create a rectangular mask.
        width_pct, height_pct: Size as percentage of image dimensions.
        x_pct, y_pct: Center position as percentage of image dimensions (0.0 to 1.0).
        """
        h, w = shape
        
        # Calculate center in pixels
        center_x = int(x_pct * w)
        center_y = int(y_pct * h)
        
        # Calculate half-dimensions in pixels
        r_w = int((width_pct * w) / 2)
        r_h = int((height_pct * h) / 2)

        # Create coordinate grids
        Y, X = np.ogrid[:h, :w]
        
        # Rectangular logic based on dynamic center
        mask_indices = (np.abs(X - center_x) <= r_w) & (np.abs(Y - center_y) <= r_h)

        if region_type == 'inner':
            mask = mask_indices
        else:  # 'outer'
            mask = ~mask_indices
            
        return mask.astype(np.float32)

    @staticmethod
    def mix_images(
        images: list[ImageModel],
        weights: list[dict],
        region_type: str,
        region_width: float,
        region_height: float,
        region_x: float,
        region_y: float,
        mix_mode: Literal['mag-phase', 'real-imag'] = 'mag-phase'
    ):
        """
        Mix 4 images using weighted FFT components and rectangular frequency masking.
        """
        if not images:
            raise ValueError("No images provided for mixing.")

        shape = images[0].shape
        # Use updated mask generator with position
        mask = MixerEngine.create_region_mask(shape, region_type, region_width, region_height, region_x, region_y)

        if mix_mode == 'mag-phase':
            mixed_mag = np.zeros_like(images[0].magnitude)
            mixed_phase = np.zeros_like(images[0].phase)

            for i in range(len(images)):
                if i < len(weights):
                    w_mag = weights[i].get('magnitude', 0.0)
                    w_phase = weights[i].get('phase', 0.0)
                    mixed_mag += images[i].magnitude * w_mag
                    mixed_phase += images[i].phase * w_phase

            mixed_fft = mixed_mag * np.exp(1j * mixed_phase)

        elif mix_mode == 'real-imag':
            mixed_real = np.zeros_like(images[0].real)
            mixed_imag = np.zeros_like(images[0].imag)

            for i in range(len(images)):
                if i < len(weights):
                    w_real = weights[i].get('real', 0.0)
                    w_imag = weights[i].get('imag', 0.0)
                    mixed_real += images[i].real * w_real
                    mixed_imag += images[i].imag * w_imag

            mixed_fft = mixed_real + 1j * mixed_imag

        else:
            raise ValueError("mix_mode must be 'mag-phase' or 'real-imag'")

        # Apply region mask
        mixed_fft_masked = mixed_fft * mask

        # Inverse FFT
        fft_unshifted = np.fft.ifftshift(mixed_fft_masked)
        reconstructed = np.fft.ifft2(fft_unshifted)
        result = np.abs(reconstructed)

        return result