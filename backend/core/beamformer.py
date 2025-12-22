# backend/core/beamformer.py
import numpy as np
import cv2
import io
import matplotlib.pyplot as plt

class PhasedArray:
    """
    Represents a physical phased array antenna system.
    """
    
    def __init__(self, num_elements=10, geometry='linear', curvature=0, 
                 frequency=6e8, position=(0.0, 0.0), spacing_factor=0.5):
        # Basic parameters
        self.num_elements = num_elements
        self.geometry = geometry
        self.curvature = curvature
        self.position = np.array(position)
        self.spacing_factor = spacing_factor
        
        # Constant
        self.propagation_speed = 3e8

        # Internal backing fields
        self._frequency = frequency
        self._steering_angle = 0.0
        
        # Initialize dependent physics variables (wavelength, k, distance)
        # We call the internal updater directly to set initial state
        self._recalculate_physics()
        
        # Initialize frequency multipliers (defaults to 1.0)
        self.freq_multipliers = np.ones(num_elements, dtype=np.float64)

        # Generate positions (Must happen after physics calc because it depends on self.distance)
        self.element_positions = self._generate_local_positions()

    # --- Properties (Getters & Setters) ---

    @property
    def frequency(self) -> float:
        """Operating frequency in Hz."""
        return self._frequency

    @frequency.setter
    def frequency(self, val: float):
        """
        Sets frequency and updates all dependent physics calculations.
        This prevents the object from having a new frequency but old wavelength.
        """
        if val <= 0:
            raise ValueError("Frequency must be positive.")
        self._frequency = val
        self._recalculate_physics()
        
        # distinct step: changing frequency changes wavelength -> changes spacing -> moves elements
        self.element_positions = self._generate_local_positions()

    @property
    def steering_angle(self) -> float:
        """Current steering angle in degrees (normalized to -180 to 180)."""
        return self._steering_angle

    @steering_angle.setter
    def steering_angle(self, val: float):
        """Sets steering angle with automatic normalization."""
        self._steering_angle = ((val + 180) % 360) - 180

    # --- Internal Helpers ---

    def _recalculate_physics(self):
        """Updates physics constants derived from frequency."""
        self.wavelength = self.propagation_speed / self._frequency
        self.k = 2 * np.pi / self.wavelength  # Wavenumber
        self.distance = self.wavelength * self.spacing_factor # Element spacing

    def _generate_local_positions(self):
        """Generates (x, y) coordinates based on current geometry and spacing."""
        span = (self.num_elements - 1) * self.distance
        x_pos = np.linspace(-span / 2, span / 2, self.num_elements)
        
        baseline_y = 0.2
        
        if self.geometry == 'curved':
            y_pos = baseline_y + self.curvature * (x_pos ** 2)
        else:
            y_pos = np.full_like(x_pos, 0)
            
        return np.stack([x_pos, y_pos], axis=1)

    # --- Public Methods ---



    def apply_offsets(self, offsets: dict):
        """Apply manual spatial offsets (e.g., for calibration/error simulation)."""
        for idx_str, offset in offsets.items():
            idx = int(idx_str)
            if 0 <= idx < len(self.element_positions):
                self.element_positions[idx, 0] += offset.get('x', 0)
                self.element_positions[idx, 1] += offset.get('y', 0)
    
    def set_frequency_multipliers(self, freq_map: dict):
        """Set harmonic multipliers for specific elements."""
        for idx_str, mult in freq_map.items():
            idx = int(idx_str)
            if 0 <= idx < self.num_elements:
                self.freq_multipliers[idx] = float(mult)

    def get_global_positions(self):
        return self.element_positions + self.position

    def calculate_field_contribution(self, grid_x, grid_y):
        """
        Calculates complex field intensity at grid points using vectorized broadcasting.
        """
        # 1. Steering Delay: Phase shift required to tilt the beam
        theta_rad = np.radians(self.steering_angle)
        # delay_rad represents the phase lag between adjacent elements
        delay_rad = self.k * self.distance * np.sin(theta_rad)
        
        global_pos = self.get_global_positions()
        
        # 2. Broadcasting Setup
        # Elements: (N, 1, 1) | Grid: (1, H, W)
        x_elements = global_pos[:, 0][:, np.newaxis, np.newaxis]
        y_elements = global_pos[:, 1][:, np.newaxis, np.newaxis]
        
        gx = grid_x[np.newaxis, :, :]
        gy = grid_y[np.newaxis, :, :]
        
        # 3. Distance Matrix (R)
        R = np.sqrt((gx - x_elements) ** 2 + (gy - y_elements) ** 2)
        
        # 4. Steering Compensation (The "Invert" Logic)
        # We apply negative phase to cancel out the geometric head-start of closer elements
        indices = np.arange(self.num_elements)[:, np.newaxis, np.newaxis]
        steering_phases = -indices * delay_rad
        
        # 5. Variable Frequency Handling
        k_vec = self.k * self.freq_multipliers
        k_vec = k_vec[:, np.newaxis, np.newaxis]
        
        # 6. Total Phase = Propagation Phase (kR) + Steering Offset
        phases = k_vec * R + steering_phases
        
        # 7. Superposition (Summing sine waves)
        field_sum = np.sum(np.sin(phases), axis=0)
        
        return field_sum

    def get_beam_profile(self, start_angle=0, end_angle=180, points=360):
        """Calculates Far-Field Array Factor for polar plots."""
        azimuth_rad = np.linspace(np.radians(start_angle), np.radians(end_angle), points)
        angles_deg = np.degrees(azimuth_rad)
        
        theta_steer = np.radians(self.steering_angle)
        delay_rad = self.k * self.distance * np.sin(theta_steer)
        phases = np.array([-i * delay_rad for i in range(self.num_elements)])
        
        k_vec = self.k * self.freq_multipliers
        
        beam_summation = np.zeros_like(azimuth_rad, dtype=np.complex128)

        for i in range(self.num_elements):
            x = self.element_positions[i, 0]
            y = self.element_positions[i, 1]
            
            # Polar coordinates of the element itself
            r_elem = np.sqrt(x**2 + y**2)
            theta_elem = np.arctan2(y, x)
            
            # Far-field phase approximation
            phase_term = -k_vec[i] * r_elem * np.cos(azimuth_rad - theta_elem) + phases[i]
            beam_summation += np.exp(1j * phase_term)

        return angles_deg, np.abs(beam_summation)

    def render_polar_plot(self) -> bytes:
        """Visualizes the beam profile using OpenCV."""
        angles, magnitude = self.get_beam_profile(0, 180, 360)
        
        W, H = 600, 400
        img = np.zeros((H, W, 3), dtype=np.uint8)
        img[:] = (5, 5, 5) 
        
        center = (W // 2, H - 30)
        radius = min(W // 2, H) - 50
        
        # Draw Grid
        for r_scale in [0.25, 0.5, 0.75, 1.0]:
            r_px = int(radius * r_scale)
            cv2.ellipse(img, center, (r_px, r_px), 0, 180, 360, (50, 50, 50), 1)
            
        # Draw Angles
        for ang_deg in range(0, 181, 30):
            ang_rad = np.radians(ang_deg)
            x = int(center[0] + radius * np.cos(ang_rad))
            y = int(center[1] - radius * np.sin(ang_rad))
            cv2.line(img, center, (x, y), (50, 50, 50), 1)
            
        # Draw Profile
        max_mag = np.max(magnitude)
        norm_mag = magnitude / max_mag if max_mag > 0 else magnitude

        pts = []
        for a_deg, m in zip(angles, norm_mag):
            a_rad = np.radians(a_deg)
            r_px = int(m * radius)
            x = int(center[0] + r_px * np.cos(a_rad))
            y = int(center[1] - r_px * np.sin(a_rad))
            pts.append([x, y])
            
        pts = np.array(pts, np.int32).reshape((-1, 1, 2))
        cv2.polylines(img, [pts], False, (255, 255, 0), 2)
        
        success, buffer = cv2.imencode('.png', img)
        if not success:
            raise ValueError("Could not encode image")
        return buffer.tobytes()


class BeamSystem:
    """
    Simulation Manager.
    Handles the 2D grid generation and superposition of fields from multiple arrays.
    """
    def __init__(self, resolution=300, min_x=-25, max_x=25, min_y=0, max_y=40):
        self.resolution = resolution
        self.bounds = (min_x, max_x, min_y, max_y)
        self.arrays = []
        
        x = np.linspace(min_x, max_x, resolution)
        y = np.linspace(min_y, max_y, resolution)
        self.X, self.Y = np.meshgrid(x, y)
        self.total_field = np.zeros_like(self.X, dtype=np.float64)

    def add_array(self, array: PhasedArray):
        self.arrays.append(array)

    def simulate(self):
        self.total_field.fill(0)
        for arr in self.arrays:
            self.total_field += arr.calculate_field_contribution(self.X, self.Y)

    def render_heatmap(self) -> bytes:
        """Generates a logarithmic heatmap of the interference field."""
        abs_field = np.abs(self.total_field)
        log_field = np.log1p(abs_field) # Log scale to show side lobes
        
        f_min, f_max = np.min(log_field), np.max(log_field)
        if f_max - f_min == 0:
            norm = np.zeros_like(log_field, dtype=np.uint8)
        else:
            norm = (255 * (log_field - f_min) / (f_max - f_min)).astype(np.uint8)
            
        colored = cv2.applyColorMap(norm, cv2.COLORMAP_JET)
        colored = cv2.flip(colored, 0)
        self._draw_antennas(colored)
        
        success, buffer = cv2.imencode('.png', colored)
        if not success:
            raise ValueError("Could not encode image")
        return buffer.tobytes()

    def _draw_antennas(self, img):
        min_x, max_x, min_y, max_y = self.bounds
        res = self.resolution
        
        for arr in self.arrays:
            global_pos = arr.get_global_positions()
            for x, y in global_pos:
                norm_x = (x - min_x) / (max_x - min_x)
                norm_y = (y - min_y) / (max_y - min_y)
                
                px_col = int(np.clip(norm_x * res, 0, res - 1))
                px_row = int(np.clip((1 - norm_y) * res, 0, res - 1))
                
                cv2.circle(img, (px_col, px_row), 6, (0, 0, 255), -1)
                cv2.circle(img, (px_col, px_row), 7, (255, 255, 255), 2)