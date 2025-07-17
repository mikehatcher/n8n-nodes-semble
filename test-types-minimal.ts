// Minimal type validation test
type TestPatient = {
	id: string;
	firstName: string;
	lastName: string;
	createdAt: string;
	updatedAt: string;
};

type TestResourceType = 'patient' | 'booking' | 'doctor' | 'location' | 'bookingType';

const patient: TestPatient = {
	id: 'test-id',
	firstName: 'John',
	lastName: 'Doe',
	createdAt: '2025-01-01T00:00:00Z',
	updatedAt: '2025-01-01T00:00:00Z'
};

const resourceType: TestResourceType = 'patient';

// Types compile successfully if we get here
export {};
