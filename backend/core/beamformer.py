# backend/core/beamformer.py
import numpy as np
import cv2
import io
import matplotlib.pyplot as plt

class PhasedArray:
    def __init__(self, num_elements=10, geometry='linear', curvature=0, 
                 frequency=6e8, position=(0.0, 0.0), spacing_factor=0.5):
        self.num_elements = num_elements
        self.frequency = frequency
        self.propagation_speed = 3e8
        self.wavelength = self.propagation_speed / self.frequency
        self.k = 2 * np.pi / self.wavelength
        
        self.geometry = geometry
        self.curvature = curvature
        self.position = np.array(position)
        self.spacing_factor = spacing_factor
        self.distance = self.wavelength * spacing_factor
        
        self.steering_angle = 0
        
        # Initialize frequency multipliers (defaults to 1.0)
        self.freq_multipliers = np.ones(num_elements, dtype=np.float64)

        # Generate positions MUST happen after geometry is set
        self.element_positions = self._generate_local_positions()

    def _generate_local_positions(self):
        span = (self.num_elements - 1) * self.distance
        x_pos = np.linspace(-span / 2, span / 2, self.num_elements)
        
        baseline_y = 0.2
        
        # FIX: Strict check. Only apply curvature if mode is actually 'curved'.
        # Previously "or self.curvature > 0" caused linear mode to appear curved
        # if the slider had a value.
        if self.geometry == 'curved':
            y_pos = baseline_y + self.curvature * (x_pos ** 2)
        else:
            y_pos = np.full_like(x_pos, 0)
            
        return np.stack([x_pos, y_pos], axis=1)

    def apply_offsets(self, offsets: dict):
        """Apply manual offsets to specific antenna elements."""
        for idx_str, offset in offsets.items():
            idx = int(idx_str)
            if 0 <= idx < len(self.element_positions):
                self.element_positions[idx, 0] += offset.get('x', 0)
                self.element_positions[idx, 1] += offset.get('y', 0)
    
    def set_frequency_multipliers(self, freq_map: dict):
        for idx_str, mult in freq_map.items():
            idx = int(idx_str)
            if 0 <= idx < self.num_elements:
                self.freq_multipliers[idx] = float(mult)

    def set_steering(self, angle_deg):
        self.steering_angle = angle_deg

    def get_global_positions(self):
        return self.element_positions + self.position

    def calculate_field_contribution(self, grid_x, grid_y):
        """
        Calculates this array's contribution to the field at grid points.
        Vectorized for performance. Supports individual frequencies.
        """
        # Steering delay (Progressive phase shift based on base frequency)
        theta_rad = np.radians(self.steering_angle)
        delay_rad = self.k * self.distance * np.sin(theta_rad)
        
        global_pos = self.get_global_positions()
        
        # Expand dimensions for broadcasting: 
        # Elements (N, 1, 1) vs Grid (1, H, W)
        x_elements = global_pos[:, 0][:, np.newaxis, np.newaxis]
        y_elements = global_pos[:, 1][:, np.newaxis, np.newaxis]
        
        gx = grid_x[np.newaxis, :, :]
        gy = grid_y[np.newaxis, :, :]
        
        # Calculate Distances for all elements to all points at once
        R = np.sqrt((gx - x_elements) ** 2 + (gy - y_elements) ** 2)
        
        # Phase indices [0, 1, ... N]
        indices = np.arange(self.num_elements)[:, np.newaxis, np.newaxis]
        steering_phases = -indices * delay_rad
        
        # Vectorized K for individual frequencies
        # Shape (N,) -> (N, 1, 1)
        k_vec = self.k * self.freq_multipliers
        k_vec = k_vec[:, np.newaxis, np.newaxis]
        
        # Total phase = k_local * R + steering_phase
        phases = k_vec * R + steering_phases
        
        # Sum sin(phases) across all elements (axis 0)
        field_sum = np.sum(np.sin(phases), axis=0)
        
        return field_sum

    def get_beam_profile(self, start_angle=0, end_angle=180, points=360):
        """
        Calculates the Array Factor for polar plotting.
        Updated to support individual frequencies.
        """
        # Convert range to Radians (0 to Pi)
        azimuth_rad = np.linspace(np.radians(start_angle), np.radians(end_angle), points)
        angles_deg = np.degrees(azimuth_rad)
        
        # Steering phase delay
        theta_steer = np.radians(self.steering_angle)
        delay_rad = self.k * self.distance * np.sin(theta_steer)
        phases = np.array([-i * delay_rad for i in range(self.num_elements)])
        
        # Local K vector
        k_vec = self.k * self.freq_multipliers
        
        beam_summation = np.zeros_like(azimuth_rad, dtype=np.complex128)

        # Sum contributions from each actual element position
        for i in range(self.num_elements):
            x = self.element_positions[i, 0]
            y = self.element_positions[i, 1]
            
            # Convert cartesian element pos to polar relative to array center
            r_elem = np.sqrt(x**2 + y**2)
            theta_elem = np.arctan2(y, x)
            
            # Far-field approximation phase term with INDIVIDUAL K
            phase_term = -k_vec[i] * r_elem * np.cos(azimuth_rad - theta_elem) + phases[i]
            beam_summation += np.exp(1j * phase_term)

        return angles_deg, np.abs(beam_summation)

    def render_polar_plot(self) -> bytes:
        """
        Generates the polar plot image bytes using OpenCV for high performance.
        """
        angles, magnitude = self.get_beam_profile(0, 180, 360)
        
        # Canvas Settings
        W, H = 600, 400
        img = np.zeros((H, W, 3), dtype=np.uint8)
        img[:] = (5, 5, 5) # Dark background #050505
        
        center = (W // 2, H - 30)
        radius = min(W // 2, H) - 50
        
        # Draw Grid (Semi-circles)
        for r_scale in [0.25, 0.5, 0.75, 1.0]:
            r_px = int(radius * r_scale)
            cv2.ellipse(img, center, (r_px, r_px), 0, 180, 360, (50, 50, 50), 1)
            
        # Draw Angle Lines (0 to 180 every 30 deg)
        for ang_deg in range(0, 181, 30):
            ang_rad = np.radians(ang_deg)
            # Polar conversion (0 is East/Right, increasing CCW)
            x = int(center[0] + radius * np.cos(ang_rad))
            y = int(center[1] - radius * np.sin(ang_rad))
            cv2.line(img, center, (x, y), (50, 50, 50), 1)
            
        # Normalize magnitude to fit radius
        max_mag = np.max(magnitude)
        if max_mag > 0:
            norm_mag = magnitude / max_mag
        else:
            norm_mag = magnitude

        # Convert profile to points
        pts = []
        for a_deg, m in zip(angles, norm_mag):
            a_rad = np.radians(a_deg)
            r_px = int(m * radius)
            x = int(center[0] + r_px * np.cos(a_rad))
            y = int(center[1] - r_px * np.sin(a_rad))
            pts.append([x, y])
            
        pts = np.array(pts, np.int32)
        pts = pts.reshape((-1, 1, 2))
        
        # Draw Profile Line (Cyan)
        cv2.polylines(img, [pts], False, (255, 255, 0), 2)
        
        success, buffer = cv2.imencode('.png', img)
        if not success:
            raise ValueError("Could not encode image")
        return buffer.tobytes()


class BeamSystem:
    """
    Composite class to manage the simulation environment and multiple arrays.
    Handles the grid generation and superposition of fields.
    """
    def __init__(self, resolution=300, min_x=-25, max_x=25, min_y=0, max_y=40):
        self.resolution = resolution
        self.bounds = (min_x, max_x, min_y, max_y)
        self.arrays = []
        
        # Generate Grid
        x = np.linspace(min_x, max_x, resolution)
        y = np.linspace(min_y, max_y, resolution)
        self.X, self.Y = np.meshgrid(x, y)
        self.total_field = np.zeros_like(self.X, dtype=np.float64)

    def add_array(self, array: PhasedArray):
        self.arrays.append(array)

    def simulate(self):
        """Sum fields from all registered arrays."""
        self.total_field.fill(0)
        for arr in self.arrays:
            self.total_field += arr.calculate_field_contribution(self.X, self.Y)

    def render_heatmap(self) -> bytes:
        """Generates the interference map with antenna overlays."""
        # Process Physics Data
        abs_field = np.abs(self.total_field)
        
        # Matches harmonicode normalization: log1p then min-max
        log_field = np.log1p(abs_field)
        
        # Normalize to 0-255
        f_min, f_max = np.min(log_field), np.max(log_field)
        if f_max - f_min == 0:
            norm = np.zeros_like(log_field, dtype=np.uint8)
        else:
            norm = (255 * (log_field - f_min) / (f_max - f_min)).astype(np.uint8)
            
        colored = cv2.applyColorMap(norm, cv2.COLORMAP_JET)
        
        # Flip Y (physically bottom is Y=0, image top is row 0)
        colored = cv2.flip(colored, 0)
        
        # Draw Arrays
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
                # Coordinate Mapping: Physics -> Pixels
                norm_x = (x - min_x) / (max_x - min_x)
                norm_y = (y - min_y) / (max_y - min_y)
                
                px_col = int(np.clip(norm_x * res, 0, res - 1))
                # Flip row because image Y is top-down, physics Y is bottom-up
                px_row = int(np.clip((1 - norm_y) * res, 0, res - 1))
                
                # Draw
                cv2.circle(img, (px_col, px_row), 6, (0, 0, 255), -1)
                cv2.circle(img, (px_col, px_row), 7, (255, 255, 255), 2)