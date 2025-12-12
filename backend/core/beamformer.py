import numpy as np


class PhasedArray:
    def __init__(self, num_elements=16, geometry='linear', curvature=0, frequency=1e9):
        self.c = 3e8  # Speed of light
        self.N = num_elements
        self.freq = frequency
        self.wavelength = self.c / self.freq
        self.k = 2 * np.pi / self.wavelength  # Wave number
        self.geometry = geometry
        self.curvature_radius = curvature if curvature > 0 else None

        # Generate Element Positions
        self.positions = self._generate_positions()

    def _generate_positions(self):
        x = np.arange(self.N) * (self.wavelength / 2)  # half-wavelength spacing
        y = np.zeros(self.N)

        if self.geometry == 'curved' and self.curvature_radius:
            # Arc arrangement
            angle_span = x[-1] / self.curvature_radius
            thetas = np.linspace(-angle_span / 2, angle_span / 2, self.N)
            x = self.curvature_radius * np.sin(thetas)
            y = self.curvature_radius * (1 - np.cos(thetas))

        return np.column_stack((x, y))

    def calculate_interference_map(self, steering_angle_deg):
        """
        Calculates Array Factor using Z-Transform analog.
        Z-transform delay: z^-n -> corresponds to phase shift e^(-j*k*d)
        """
        # Grid for visualization
        resolution = 100
        x_space = np.linspace(-10, 10, resolution)
        y_space = np.linspace(0, 20, resolution)  # Forward direction
        X, Y = np.meshgrid(x_space, y_space)

        field = np.zeros_like(X, dtype=np.complex128)

        # Steering Phase Shift (Calibration)
        # We want constructive interference at steering_angle
        # delay_n = pos_x * sin(theta) ...
        theta_rad = np.radians(steering_angle_deg)

        for i in range(self.N):
            pos_x, pos_y = self.positions[i]

            # Distance from element to every point in space (r)
            r = np.sqrt((X - pos_x) ** 2 + (Y - pos_y) ** 2)

            # Intrinsic Steering Delay (Compensation)
            # To steer to theta, we add a phase shift that cancels the geometric path difference
            # Path difference to target at infinity = x * sin(theta)
            steering_phase = -self.k * (pos_x * np.sin(theta_rad) + pos_y * np.cos(theta_rad))

            # Signal Propagation: e^(-jkr) / r
            # Z-Transform Logic: H(z) = Sum( z^-n ) where z is spatially dependent
            field += (np.exp(-1j * (self.k * r + steering_phase)) / (r + 0.1))

        return np.abs(field)