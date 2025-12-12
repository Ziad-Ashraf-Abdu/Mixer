import numpy as np
import cv2


class ImageModel:
    def __init__(self, file_bytes: bytes, target_size: tuple = None):
        # [cite_start]1. Decode & Convert to Grayscale [cite: 7]
        nparr = np.frombuffer(file_bytes, np.uint8)
        self.original = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

        # [cite_start]2. Resize Logic (Unified Size) [cite: 8]
        if target_size:
            self.original = cv2.resize(self.original, target_size)

        self.shape = self.original.shape

        # [cite_start]3. Precompute FFT Components [cite: 9]
        self.fft_data = np.fft.fftshift(np.fft.fft2(self.original))
        self.magnitude = np.abs(self.fft_data)
        self.phase = np.angle(self.fft_data)
        self.real = np.real(self.fft_data)
        self.imag = np.imag(self.fft_data)

    def get_component(self, type_str: str):
        if type_str == 'Magnitude': return 20 * np.log(self.magnitude + 1)  # Log scale for view
        if type_str == 'Phase': return self.phase
        if type_str == 'Real': return 20 * np.log(np.abs(self.real) + 1)
        if type_str == 'Imaginary': return np.log(np.abs(self.imag) + 1)
        return self.original


class MixerEngine:
    @staticmethod
    def mix_images(images: list[ImageModel], weights: list[dict], region_mask: np.ndarray):
        """
        Mixes 4 images based on weights and applies region filtering.
        weights format: [{'mag': 0.5, 'phase': 0}, ...] for each image
        """
        final_fft = np.zeros_like(images[0].fft_data, dtype=np.complex128)

        # [cite_start]Accumulate weighted components [cite: 16]
        mixed_mag = np.zeros_like(images[0].magnitude)
        mixed_phase = np.zeros_like(images[0].phase)

        for i, img in enumerate(images):
            w_mag = weights[i]['magnitude']
            w_phase = weights[i]['phase']

            # Simplification for mixing: We mix mag and phase separately then combine
            # (Note: Strictly mixing Real/Imag is linear, Mag/Phase is non-linear)
            mixed_mag += img.magnitude * w_mag
            mixed_phase += img.phase * w_phase

        # [cite_start]Region Mixing (Inner vs Outer) [cite: 20]
        # We apply the mask to decide which frequencies pass.
        # This implementation assumes the mask determines the "active" zone for this mix.

        # Reconstruct Complex FFT
        final_fft = mixed_mag * np.exp(1j * mixed_phase)

        # Apply Region Mask (1 for pass, 0 for stop)
        # Note: In a full mixer, you might mix Region A from Image 1 and Region B from Image 2.
        # Here we apply the result mask.
        final_fft = final_fft * region_mask

        # [cite_start]Inverse FFT [cite: 16]
        result = np.fft.ifft2(np.fft.ifftshift(final_fft))
        return np.abs(result)