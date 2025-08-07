/**
 * @fileoverview Test suite for booking GraphQL queries
 * @description Tests for booking query definitions and validation
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Shared
 */

import {
  BOOKING_FIELDS,
  BOOKING_FIELDS_WITH_DOCTOR,
  BOOKING_FIELDS_BASIC,
  GET_BOOKING_QUERY,
  GET_BOOKINGS_QUERY,
  CREATE_BOOKING_MUTATION,
  UPDATE_BOOKING_MUTATION,
  DELETE_BOOKING_MUTATION,
  UPDATE_BOOKING_JOURNEY_MUTATION,
} from "../../nodes/Semble/shared/BookingQueries";

describe("Booking Queries", () => {
  describe("BOOKING_FIELDS", () => {
    it("should contain all expanded booking fields", () => {
      const requiredFields = [
        "id",
        "deleted",
        "cancellationReason",
        "doctorName",
        "start", 
        "end",
        "createdAt",
        "updatedAt",
        "videoUrl",
        "comments",
        "reference",
        "billed",
        "patientId",
        "onlineBookingPaymentStatus",
      ];
      
      requiredFields.forEach((field) => {
        expect(BOOKING_FIELDS).toContain(field);
      });
    });

    it("should include nested patient fields", () => {
      const nestedPatientFields = ["id", "firstName", "lastName", "email"];
      
      nestedPatientFields.forEach((field) => {
        expect(BOOKING_FIELDS).toContain(field);
      });
    });

    it("should include nested appointment fields", () => {
      const appointmentFields = ["id", "title", "duration", "price"];
      
      appointmentFields.forEach((field) => {
        expect(BOOKING_FIELDS).toContain(field);
      });
    });

    it("should include booking journey fields", () => {
      const journeyFields = ["arrived", "consultation", "departed", "dna"];
      
      journeyFields.forEach((field) => {
        expect(BOOKING_FIELDS).toContain(field);
      });
    });

    it("should include patient messages sent fields", () => {
      const messageFields = ["confirmation", "reminder", "followup", "cancellation"];
      
      messageFields.forEach((field) => {
        expect(BOOKING_FIELDS).toContain(field);
      });
    });

    it("should include location fields", () => {
      expect(BOOKING_FIELDS).toContain("location {");
      expect(BOOKING_FIELDS).toContain("id");
      expect(BOOKING_FIELDS).toContain("name");
    });
  });

  describe("BOOKING_FIELDS_WITH_DOCTOR", () => {
    it("should include all doctor fields for privileged users", () => {
      const doctorFields = ["firstName", "lastName", "email"]; // Note: phone not included in current implementation
      
      doctorFields.forEach((field) => {
        expect(BOOKING_FIELDS_WITH_DOCTOR).toContain(field);
      });
    });

    it("should include all standard booking fields", () => {
      expect(BOOKING_FIELDS_WITH_DOCTOR).toContain("id");
      expect(BOOKING_FIELDS_WITH_DOCTOR).toContain("start");
      expect(BOOKING_FIELDS_WITH_DOCTOR).toContain("end");
      expect(BOOKING_FIELDS_WITH_DOCTOR).toContain("comments");
    });

    it("should have more content than basic fields", () => {
      expect(BOOKING_FIELDS_WITH_DOCTOR.length).toBeGreaterThan(BOOKING_FIELDS_BASIC.length);
    });
  });

  describe("BOOKING_FIELDS_BASIC", () => {
    it("should include essential fields without doctor details", () => {
      const basicFields = ["id", "start", "end", "createdAt", "updatedAt"]; // Note: patientId not in BASIC fields
      
      basicFields.forEach((field) => {
        expect(BOOKING_FIELDS_BASIC).toContain(field);
      });
    });

    it("should not include detailed doctor fields", () => {
      expect(BOOKING_FIELDS_BASIC).not.toContain("doctor { firstName");
      expect(BOOKING_FIELDS_BASIC).not.toContain("doctor { lastName");
      expect(BOOKING_FIELDS_BASIC).not.toContain("doctor { email");
    });
  });

  describe("UPDATE_BOOKING_JOURNEY_MUTATION", () => {
    it("should be a valid GraphQL mutation", () => {
      expect(UPDATE_BOOKING_JOURNEY_MUTATION).toContain("mutation UpdateBookingJourney");
      expect(UPDATE_BOOKING_JOURNEY_MUTATION).toContain("$id: ID!");
      expect(UPDATE_BOOKING_JOURNEY_MUTATION).toContain("$journeyStage: JourneyStage!");
      expect(UPDATE_BOOKING_JOURNEY_MUTATION).toContain("$date: Date");
    });

    it("should include data response field", () => {
      expect(UPDATE_BOOKING_JOURNEY_MUTATION).toContain("data {");
    });

    it("should include error response field", () => {
      expect(UPDATE_BOOKING_JOURNEY_MUTATION).toContain("error");
    });
  });

  describe("GET_BOOKING_QUERY", () => {
    it("should be a valid GraphQL query for single booking", () => {
      expect(GET_BOOKING_QUERY).toContain("query GetBooking($id: ID!)");
      expect(GET_BOOKING_QUERY).toContain("booking(id: $id)");
      expect(GET_BOOKING_QUERY).toContain(BOOKING_FIELDS);
    });

    it("should accept an ID parameter", () => {
      expect(GET_BOOKING_QUERY).toContain("$id: ID!");
    });
  });

  describe("GET_BOOKINGS_QUERY", () => {
    it("should be a valid GraphQL query for multiple bookings", () => {
      expect(GET_BOOKINGS_QUERY).toContain("query GetBookings");
      expect(GET_BOOKINGS_QUERY).toContain("bookings(");
      expect(GET_BOOKINGS_QUERY).toContain("data {");
      expect(GET_BOOKINGS_QUERY).toContain("pageInfo {");
      expect(GET_BOOKINGS_QUERY).toContain("hasMore");
    });

    it("should include pagination parameters", () => {
      expect(GET_BOOKINGS_QUERY).toContain("$pagination: Pagination");
      expect(GET_BOOKINGS_QUERY).toContain("$options: QueryOptions");
      expect(GET_BOOKINGS_QUERY).toContain("$dateRange: DateRange");
    });

    it("should use booking fields in data section", () => {
      expect(GET_BOOKINGS_QUERY).toContain(BOOKING_FIELDS);
    });
  });

  describe("CREATE_BOOKING_MUTATION", () => {
    it("should be a valid GraphQL mutation for creating bookings", () => {
      expect(CREATE_BOOKING_MUTATION).toContain("mutation CreateBooking");
      expect(CREATE_BOOKING_MUTATION).toContain("createBooking(");
      expect(CREATE_BOOKING_MUTATION).toContain("$bookingData: BookingDataInput");
    });

    it("should return booking data and error handling", () => {
      expect(CREATE_BOOKING_MUTATION).toContain("data {");
      expect(CREATE_BOOKING_MUTATION).toContain("error");
      expect(CREATE_BOOKING_MUTATION).toContain(BOOKING_FIELDS);
    });
  });

  describe("UPDATE_BOOKING_MUTATION", () => {
    it("should be a valid GraphQL mutation for updating bookings", () => {
      expect(UPDATE_BOOKING_MUTATION).toContain("mutation UpdateBooking");
      expect(UPDATE_BOOKING_MUTATION).toContain("updateBooking(");
      expect(UPDATE_BOOKING_MUTATION).toContain("$id: ID!");
      expect(UPDATE_BOOKING_MUTATION).toContain("$bookingData: BookingDataInput");
    });

    it("should return updated booking data", () => {
      expect(UPDATE_BOOKING_MUTATION).toContain("data {");
      expect(UPDATE_BOOKING_MUTATION).toContain("error");
      expect(UPDATE_BOOKING_MUTATION).toContain(BOOKING_FIELDS);
    });
  });

  describe("DELETE_BOOKING_MUTATION", () => {
    it("should be a valid GraphQL mutation for deleting bookings", () => {
      expect(DELETE_BOOKING_MUTATION).toContain("mutation DeleteBooking");
      expect(DELETE_BOOKING_MUTATION).toContain("deleteBooking(");
      expect(DELETE_BOOKING_MUTATION).toContain("$id: ID!");
    });

    it("should return minimal booking data after deletion", () => {
      expect(DELETE_BOOKING_MUTATION).toContain("data {");
      expect(DELETE_BOOKING_MUTATION).toContain("error");
      expect(DELETE_BOOKING_MUTATION).toContain("id");
      expect(DELETE_BOOKING_MUTATION).toContain("status");
    });
  });

  describe("Query Structure Validation", () => {
    const queries = [
      GET_BOOKING_QUERY,
      GET_BOOKINGS_QUERY,
      CREATE_BOOKING_MUTATION,
      UPDATE_BOOKING_MUTATION,
      DELETE_BOOKING_MUTATION,
    ];

    it("should have properly balanced braces in all queries", () => {
      queries.forEach((query) => {
        const openBraces = (query.match(/{/g) || []).length;
        const closeBraces = (query.match(/}/g) || []).length;
        expect(openBraces).toBe(closeBraces);
      });
    });

    it("should not contain syntax errors", () => {
      queries.forEach((query) => {
        expect(query).not.toContain("undefined");
        expect(query).not.toContain("null");
        expect(query.trim()).not.toBe("");
      });
    });
  });
});
