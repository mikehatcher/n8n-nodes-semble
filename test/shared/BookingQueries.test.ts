/**
 * @fileoverview Test suite for booking GraphQL queries
 * @description Tests for booking query definitions and validation
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Shared
 */

import {
  BOOKING_FIELDS,
  GET_BOOKING_QUERY,
  GET_BOOKINGS_QUERY,
  CREATE_BOOKING_MUTATION,
  UPDATE_BOOKING_MUTATION,
  DELETE_BOOKING_MUTATION,
} from "../../nodes/Semble/shared/BookingQueries";

describe("Booking Queries", () => {
  describe("BOOKING_FIELDS", () => {
    it("should contain all essential booking fields", () => {
      const requiredFields = [
        "id",
        "status", 
        "start", 
        "end", 
        "duration",
        "comments",
        "createdAt",
        "updatedAt",
        "patient",
        "location",
        "doctor",
        "bookingType",
      ];      requiredFields.forEach((field) => {
        expect(BOOKING_FIELDS).toContain(field);
      });
    });

    it("should include nested patient fields", () => {
      const nestedPatientFields = ["id", "firstName", "lastName", "email"];
      
      nestedPatientFields.forEach((field) => {
        expect(BOOKING_FIELDS).toContain(field);
      });
    });

    it("should include location and practitioner fields", () => {
      expect(BOOKING_FIELDS).toContain("location {");
      expect(BOOKING_FIELDS).toContain("doctor {");
      expect(BOOKING_FIELDS).toContain("bookingType {");
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
      expect(GET_BOOKINGS_QUERY).toContain("$search: String");
      expect(GET_BOOKINGS_QUERY).toContain("$options: QueryOptions");
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
