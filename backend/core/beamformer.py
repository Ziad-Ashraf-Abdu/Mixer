# core/beamformer.py
import numpy as np

class PhasedArray:
    def __init__(self, num_elements=10, geometry='Linear', curvature=0, frequency=1e8, position=(0.0, 0.0)):
        # Parameters from the snippet
        self.num_antennas = num_elements
        self.frequency = frequency # Default 100 Hz in snippet, keeping flexible
        self.propagation_speed = 3e8 # Speed of light (user snippet had 100, but 3e8 is realistic for RF)
        
        # User snippet defaults to 100 for speed and freq, which gives wavelength=1. 
        # If we use 3e8 speed and 1e9 freq, wavelength is 0.3. 
        # We will stick to the snippet's logic but use the passed frequency.
        self.wavelength = self.propagation_speed / self.frequency
        self.k = 2 * np.pi / self.wavelength

        self.array_geometry = geometry
        # Normalize curvature 0-1 from frontend to snippet's usage (which seems to be 0.0 - 1.0 or larger)
        self.curvature = curvature 
        
        self.position = np.array(position) 
        
        # Determine Antenna Positions (Snippet Logic)
        # Snippet uses a fixed list for Linear or generates for Curved.
        # We will generate dynamic lists centered around 0.
        
        # Distance calculation: Snippet uses self.distance_m = 2 (which implies lambda/2 spacing approx)
        # We will derive spacing d from wavelength/2 standard
        self.distance = self.wavelength / 2 
        
        # Generate Local Positions (X, Y)
        self.element_positions = self._generate_local_positions()

    def _generate_local_positions(self):
        # Snippet Logic for X:
        # np.linspace(-((num - 1) * dist) / 2, ((num - 1) * dist) / 2, num)
        span = (self.num_antennas - 1) * self.distance
        x_pos = np.linspace(-span / 2, span / 2, self.num_antennas)
        
        # Snippet Logic for Y:
        # y_positions = 0.01 * np.max(self.Y) + curvature * (x**2)
        # Note: We don't have the grid Y here yet, but snippet assumes max(Y) = 20.
        # So 0.01 * 20 = 0.2 baseline offset.
        baseline_y = 0.2
        
        if self.array_geometry == 'curved' or self.curvature > 0:
            # The snippet uses a normalized curvature slider 0-100 mapped to 0-1.
            # We assume self.curvature is passed as 0-1 float or comparable.
            y_pos = baseline_y + self.curvature * (x_pos ** 2)
        else:
            y_pos = np.full_like(x_pos, 0)
            
        return np.stack([x_pos, y_pos], axis=1)

    def calculate_interference_map(self, steering_angle_deg, grid_x, grid_y):
        """
        Generates the heatmap data using the "Sum of Sines" method from the snippet.
        """
        # 1. Calculate Delay in Radians
        # The snippet uses a direct 'delay_deg' slider. 
        # We must convert our 'steering_angle' to that 'delay' equivalent.
        # Formula: phase_shift = k * d * sin(theta)
        # delay_rad corresponds to the phase shift between adjacent elements.
        
        theta_rad = np.radians(steering_angle_deg)
        # Note: Snippet defines phase_delay = -i * delay_rad
        # Standard beamforming: delta_phi = k * d * sin(theta)
        delay_rad = self.k * self.distance * np.sin(theta_rad)

        # 2. Superimpose waves
        # Snippet: Waves_Sum += frequency_scaling * np.sin(k * R + phase_delay)
        
        # Initialize Sum (Real numbers, as snippet uses sin)
        # We use complex numbers to allow correct interference mixing between DIFFERENT arrays in main.py
        # If we just return sin(..), mixing two arrays later is just adding scalars (valid for standing waves).
        waves_sum = np.zeros_like(grid_x, dtype=np.float64)
        
        # Precompute positions with global offset
        global_elem_pos = self.element_positions + self.position

        for i in range(self.num_antennas):
            x_pos = global_elem_pos[i, 0]
            y_pos = global_elem_pos[i, 1]
            
            # Distance R
            R = np.sqrt((grid_x - x_pos) ** 2 + (grid_y - y_pos) ** 2)
            
            # Phase Delay (Progressive)
            # Snippet: phase_delay = -i * delay_rad
            phase_delay = -i * delay_rad
            
            # Summation
            # Snippet does not use 1/R attenuation. It uses pure sin waves.
            waves_sum += np.sin(self.k * R + phase_delay)

        return waves_sum

    @staticmethod
    def compute_array_factor(num_elements, steering_angle_deg, test_angles_deg, geometry='linear', curvature=0, frequency=1e8):
        """
        Generates the polar beam profile using the logic from `plot_beam_profile`.
        """
        # Physics Constants
        speed = 3e8
        wavelength = speed / frequency
        k = 2 * np.pi / wavelength
        
        # Calculate Phase Delay from Steering Angle
        theta_steer = np.radians(steering_angle_deg)
        d = wavelength / 2
        delay_rad = k * d * np.sin(theta_steer)

        # Re-generate positions (local only)
        # Copying logic from __init__ for static method availability
        span = (num_elements - 1) * d
        x_positions = np.linspace(-span / 2, span / 2, num_elements)
        
        baseline_y = 0.2
        if geometry == 'curved' or curvature > 0:
            y_positions = baseline_y + curvature * (x_positions ** 2)
        else:
            y_positions = np.full_like(x_positions, 0)
        
        # Calculate phases
        phases = np.array([-i * delay_rad for i in range(num_elements)])
        
        # Azimuth angles to test (convert input deg to rad)
        # Snippet uses linspace(0, 2pi), but we usually want -90 to 90 for the specific view.
        # However, snippet math: cos(azimuth - theta).
        azimuth_angles = np.radians(test_angles_deg)
        
        beam_summation = np.zeros_like(azimuth_angles, dtype=np.complex128)

        for i in range(num_elements):
            # Polar coordinates of the element
            r_elem = np.sqrt(x_positions[i] ** 2 + y_positions[i] ** 2)
            theta_elem = np.arctan2(y_positions[i], x_positions[i])
            
            # Snippet Logic:
            # phase_term = -k * (freq/freq) * r * cos(azimuth - theta) + phases[i]
            phase_term = -k * r_elem * np.cos(azimuth_angles - theta_elem) + phases[i]
            
            beam_summation += np.exp(1j * phase_term)
            
        # Return Magnitude (Power)
        return test_angles_deg, np.abs(beam_summation)