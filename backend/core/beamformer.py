# core/beamformer.py
import numpy as np

class PhasedArray:
    def __init__(self, num_elements=10, geometry='linear', curvature=0, frequency=1e8, position=(0.0, 0.0), spacing_factor=0.5):
        # Parameters
        self.num_antennas = num_elements
        self.frequency = frequency
        self.propagation_speed = 3e8  # Speed of light
        
        self.wavelength = self.propagation_speed / self.frequency
        self.k = 2 * np.pi / self.wavelength

        self.array_geometry = geometry
        self.curvature = curvature 
        self.position = np.array(position) 
        
        # UPDATED: Use custom spacing factor (default 0.5 = lambda/2)
        self.spacing_factor = spacing_factor
        self.distance = self.wavelength * spacing_factor  # Now controllable!
        
        # Generate Local Positions (X, Y)
        self.element_positions = self._generate_local_positions()

    def _generate_local_positions(self):
        # Calculate span using custom spacing
        span = (self.num_antennas - 1) * self.distance
        x_pos = np.linspace(-span / 2, span / 2, self.num_antennas)
        
        baseline_y = 0.2
        
        if self.array_geometry == 'curved' or self.curvature > 0:
            y_pos = baseline_y + self.curvature * (x_pos ** 2)
        else:
            y_pos = np.full_like(x_pos, 0)
            
        return np.stack([x_pos, y_pos], axis=1)

    def calculate_interference_map(self, steering_angle_deg, grid_x, grid_y):
        """
        Generates the heatmap data using the "Sum of Sines" method.
        """
        theta_rad = np.radians(steering_angle_deg)
        delay_rad = self.k * self.distance * np.sin(theta_rad)

        waves_sum = np.zeros_like(grid_x, dtype=np.float64)
        
        global_elem_pos = self.element_positions + self.position

        for i in range(self.num_antennas):
            x_pos = global_elem_pos[i, 0]
            y_pos = global_elem_pos[i, 1]
            
            R = np.sqrt((grid_x - x_pos) ** 2 + (grid_y - y_pos) ** 2)
            phase_delay = -i * delay_rad
            waves_sum += np.sin(self.k * R + phase_delay)

        return waves_sum

    @staticmethod
    def compute_array_factor(num_elements, steering_angle_deg, test_angles_deg, geometry='linear', curvature=0, frequency=1e8, spacing_factor=0.5):
        """
        Generates the polar beam profile.
        """
        speed = 3e8
        wavelength = speed / frequency
        k = 2 * np.pi / wavelength
        
        theta_steer = np.radians(steering_angle_deg)
        d = wavelength * spacing_factor  # Use custom spacing
        delay_rad = k * d * np.sin(theta_steer)

        # Re-generate positions with custom spacing
        span = (num_elements - 1) * d
        x_positions = np.linspace(-span / 2, span / 2, num_elements)
        
        baseline_y = 0.2
        if geometry == 'curved' or curvature > 0:
            y_positions = baseline_y + curvature * (x_positions ** 2)
        else:
            y_positions = np.full_like(x_positions, 0)
        
        phases = np.array([-i * delay_rad for i in range(num_elements)])
        azimuth_angles = np.radians(test_angles_deg)
        
        beam_summation = np.zeros_like(azimuth_angles, dtype=np.complex128)

        for i in range(num_elements):
            r_elem = np.sqrt(x_positions[i] ** 2 + y_positions[i] ** 2)
            theta_elem = np.arctan2(y_positions[i], x_positions[i])
            phase_term = -k * r_elem * np.cos(azimuth_angles - theta_elem) + phases[i]
            beam_summation += np.exp(1j * phase_term)
            
        return test_angles_deg, np.abs(beam_summation)