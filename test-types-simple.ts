// Simple type validation test without n8n dependencies
import { SemblePatient, SembleBooking, SembleResourceType } from './types/SembleTypes';

// Test basic type compilation
const patient: SemblePatient = {
	id: 'test-id',
	firstName: 'John',
	lastName: 'Doe',
	createdAt: '2025-01-01T00:00:00Z',
	updatedAt: '2025-01-01T00:00:00Z'
};

const resourceType: SembleResourceType = 'patient';

console.log('✅ SembleTypes compiled successfully');
console.log('Patient ID:', patient.id);
console.log('Resource Type:', resourceType);
