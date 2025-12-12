# core/beamformer.py
import numpy as np

class PhasedArray:
    def __init__(self, num_elements=16, geometry='linear', curvature=0, frequency=1e9, position=(0.0, 0.0)):
        self.c = 3e8  # Speed of light (m/s)
        self.N = num_elements
        self.freq = frequency
        self.wavelength = self.c / self.freq
        self.k = 2 * np.pi / self.wavelength
        self.geometry = geometry
        self.curvature_radius = float(curvature) if curvature > 0 else None
        self.position = np.array(position)  # Global (x, y) offset of the array center

        self.element_positions = self._generate_local_positions()

    def _generate_local_positions(self):
        """Generate element positions relative to array center."""
        # Start with linear half-wavelength spacing
        x_local = np.arange(self.N) * (self.wavelength / 2)
        x_local -= np.mean(x_local)  # Center at origin
        y_local = np.zeros(self.N)

        if self.geometry == 'curved' and self.curvature_radius is not None:
            # Convert linear span to arc
            total_span = x_local[-1] - x_local[0]
            angle_span = total_span / self.curvature_radius
            thetas = np.linspace(-angle_span / 2, angle_span / 2, self.N)
            x_local = self.curvature_radius * np.sin(thetas)
            y_local = self.curvature_radius * (1 - np.cos(thetas)) - self.curvature_radius  # Center at y=0

        return np.stack([x_local, y_local], axis=1)

    def calculate_interference_map(self, steering_angle_deg, grid_x, grid_y):
        """
        Compute complex interference field over a given grid.
        steering_angle_deg: desired beam direction (degrees, 0 = broadside)
        grid_x, grid_y: 2D meshgrid arrays (in meters)
        Returns: complex field (same shape as grid)
        """
        theta_s = np.radians(steering_angle_deg)
        field = np.zeros_like(grid_x, dtype=np.complex128)

        # Precompute steering phase per element
        steering_phases = -self.k * (
            self.element_positions[:, 0] * np.sin(theta_s) +
            self.element_positions[:, 1] * np.cos(theta_s)
        )

        for i in range(self.N):
            # Global position of element
            elem_x = self.position[0] + self.element_positions[i, 0]
            elem_y = self.position[1] + self.element_positions[i, 1]

            # Distance from element to each grid point
            dx = grid_x - elem_x
            dy = grid_y - elem_y
            r = np.sqrt(dx**2 + dy**2) + 1e-9  # Avoid division by zero

            # Phase from propagation + steering compensation
            total_phase = self.k * r + steering_phases[i]
            field += np.exp(-1j * total_phase) / r

        return field

    @staticmethod
    def compute_array_factor(num_elements, steering_angle_deg, test_angles_deg, geometry='linear', curvature=0, frequency=1e9):
        """
        Compute 1D beam pattern (array factor) vs angle for visualization.
        Returns: angles (deg), power (dB)
        """
        c = 3e8
        wavelength = c / frequency
        k = 2 * np.pi / wavelength

        theta_s = np.radians(steering_angle_deg)
        thetas = np.radians(test_angles_deg)

        if geometry == 'linear':
            d = wavelength / 2
            # Array factor for uniform linear array
            psi = k * d * (np.sin(thetas) - np.sin(theta_s))
            af = np.sin(num_elements * psi / 2) / (num_elements * np.sin(psi / 2) + 1e-9)
        else:
            # Simplified: use linear approximation for curved (or implement full)
            d = wavelength / 2
            psi = k * d * (np.sin(thetas) - np.sin(theta_s))
            af = np.sin(num_elements * psi / 2) / (num_elements * np.sin(psi / 2) + 1e-9)

        power = np.abs(af) ** 2
        power_db = 10 * np.log10(power + 1e-9)
        return test_angles_deg, power_db