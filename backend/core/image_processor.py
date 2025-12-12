# core/image_processor.py
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
        if type_opt := {
            'Magnitude': 20 * np.log(self.magnitude + 1e-9),
            'Phase': self.phase,
            'Real': self.real,
            'Imaginary': self.imag,
            'Original': self.original
        }.get(type_str):
            return type_opt
        return self.original

    def get_complex_fft(self):
        """Return the full complex FFT (shifted)."""
        return self.fft_shifted.copy()


class MixerEngine:
    @staticmethod
    def create_circular_mask(shape, region_type: str, region_size: float):
        """Create a circular mask for inner (low-freq) or outer (high-freq) region."""
        h, w = shape
        center = (h // 2, w // 2)
        max_radius = min(center)
        radius = max(1, int(region_size * max_radius))

        Y, X = np.ogrid[:h, :w]
        dist_from_center = np.sqrt((X - center[1])**2 + (Y - center[0])**2)

        if region_type == 'inner':
            mask = dist_from_center <= radius
        else:  # 'outer'
            mask = dist_from_center > radius
        return mask.astype(np.float32)

    @staticmethod
    def mix_images(
        images: list[ImageModel],
        weights: list[dict],
        region_type: str,
        region_size: float,
        mix_mode: Literal['mag-phase', 'real-imag'] = 'mag-phase'
    ):
        """
        Mix 4 images using weighted FFT components and circular frequency masking.
        Returns the mixed image (real-valued).
        """
        if not images or len(images) != 4 or len(weights) != 4:
            raise ValueError("Exactly 4 images and 4 weight dicts required.")

        shape = images[0].shape
        mask = MixerEngine.create_circular_mask(shape, region_type, region_size)

        if mix_mode == 'mag-phase':
            mixed_mag = np.zeros_like(images[0].magnitude)
            mixed_phase = np.zeros_like(images[0].phase)

            for i in range(4):
                w_mag = weights[i].get('magnitude', 0.0)
                w_phase = weights[i].get('phase', 0.0)
                mixed_mag += images[i].magnitude * w_mag
                mixed_phase += images[i].phase * w_phase

            # Reconstruct complex FFT
            mixed_fft = mixed_mag * np.exp(1j * mixed_phase)

        elif mix_mode == 'real-imag':
            mixed_real = np.zeros_like(images[0].real)
            mixed_imag = np.zeros_like(images[0].imag)

            for i in range(4):
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
        result = np.abs(reconstructed)  # Ensure real output

        return result