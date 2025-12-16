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
        self.element_positions = self._generate_local_positions()

    def _generate_local_positions(self):
        span = (self.num_elements - 1) * self.distance
        x_pos = np.linspace(-span / 2, span / 2, self.num_elements)
        
        baseline_y = 0.2
        if self.geometry == 'curved' or self.curvature > 0:
            # Curvature calculation logic
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

    def set_steering(self, angle_deg):
        self.steering_angle = angle_deg

    def get_global_positions(self):
        return self.element_positions + self.position

    def calculate_field_contribution(self, grid_x, grid_y):
        """Calculates this array's contribution to the field at grid points."""
        theta_rad = np.radians(self.steering_angle)
        # Progressive phase shift for steering
        delay_rad = self.k * self.distance * np.sin(theta_rad)
        
        field_sum = np.zeros_like(grid_x, dtype=np.float64)
        global_pos = self.get_global_positions()

        for i in range(self.num_elements):
            x_pos = global_pos[i, 0]
            y_pos = global_pos[i, 1]
            
            # Distance from element to grid point
            R = np.sqrt((grid_x - x_pos) ** 2 + (grid_y - y_pos) ** 2)
            
            # Phase = k*R + steering_phase
            phase_val = self.k * R + (-i * delay_rad)
            field_sum += np.sin(phase_val)

        return field_sum

    def get_beam_profile(self, start_angle=-90, end_angle=90, points=360):
        """
        Calculates the Array Factor for polar plotting.
        Strictly uses self.element_positions to respect manual offsets.
        """
        angles_deg = np.linspace(start_angle, end_angle, points)
        azimuth_rad = np.radians(angles_deg)
        
        # Steering phase delay
        theta_steer = np.radians(self.steering_angle)
        delay_rad = self.k * self.distance * np.sin(theta_steer)
        phases = np.array([-i * delay_rad for i in range(self.num_elements)])
        
        beam_summation = np.zeros_like(azimuth_rad, dtype=np.complex128)

        # Sum contributions from each actual element position
        for i in range(self.num_elements):
            x = self.element_positions[i, 0]
            y = self.element_positions[i, 1]
            
            # Convert cartesian element pos to polar relative to array center
            r_elem = np.sqrt(x**2 + y**2)
            theta_elem = np.arctan2(y, x)
            
            # Far-field approximation phase term
            # Phase = -k * r * cos(phi - theta_elem) + electronic_phase
            phase_term = -self.k * r_elem * np.cos(azimuth_rad - theta_elem) + phases[i]
            beam_summation += np.exp(1j * phase_term)

        return angles_deg, np.abs(beam_summation)

    def render_polar_plot(self) -> bytes:
        """Generates the polar plot image bytes internally."""
        angles, magnitude = self.get_beam_profile()
        
        # Normalize
        norm_mag = magnitude / (np.max(magnitude) + 1e-9)
        
        # Plotting
        fig = plt.figure(figsize=(6, 6), dpi=100)
        ax = fig.add_subplot(111, polar=True)
        
        theta = np.radians(angles)
        
        # Style configuration
        ax.set_theta_zero_location("N")
        ax.set_theta_direction(-1)
        ax.set_thetamin(-90)
        ax.set_thetamax(90)
        
        ax.plot(theta, norm_mag, color='#00FFFF', linewidth=2.5)
        
        # Dark Theme
        fig.patch.set_facecolor('#050505')
        ax.set_facecolor('#111')
        ax.tick_params(axis='x', colors='white', labelsize=8)
        ax.tick_params(axis='y', colors='white', labelsize=8)
        ax.spines['polar'].set_visible(False)
        ax.grid(color='gray', linestyle=':', alpha=0.3)
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', facecolor=fig.get_facecolor())
        plt.close(fig)
        buf.seek(0)
        return buf.read()


class BeamSystem:
    """
    Composite class to manage the simulation environment and multiple arrays.
    Handles the grid generation and superposition of fields.
    """
    def __init__(self, resolution=300, min_x=-25, max_x=25, min_y=-5, max_y=35):
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
        log_field = np.log1p(abs_field)
        norm = cv2.normalize(log_field, None, 0, 255, cv2.NORM_MINMAX)
        colored = cv2.applyColorMap(np.uint8(norm), cv2.COLORMAP_JET)
        
        # Flip Y (physically bottom is Y=0)
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