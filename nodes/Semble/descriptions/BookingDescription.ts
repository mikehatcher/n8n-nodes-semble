/**
 * @fileoverview Booking field descriptions and UI configuration for Semble n8n node
 * @description Provides reusable field definitions, validation rules, and UI configuration for booking operations
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Nodes.Descriptions
 */

import { INodeProperties } from "n8n-workflow";

/**
 * Booking ID field for get, delete, and update operations
 * @constant {INodeProperties}
 */
export const BOOKING_ID_FIELD: INodeProperties = {
  displayName: "Booking ID",
  name: "bookingId",
  type: "string",
  required: true,
  displayOptions: {
    show: {
      action: ["get", "delete", "update"],
      resource: ["booking"],
    },
  },
  default: "",
  placeholder: "e.g., 62e2b7d228ec4b0013179e67",
  description: "The ID of the booking to retrieve, update or delete",
};

/**
 * Patient ID field for booking creation
 * @constant {INodeProperties}
 */
export const PATIENT_ID_FIELD: INodeProperties = {
  displayName: "Patient ID",
  name: "patient",
  type: "string",
  required: true,
  displayOptions: {
    show: {
      action: ["create"],
      resource: ["booking"],
    },
  },
  default: "",
  placeholder: "e.g., 62e2b7d228ec4b0013179e67",
  description: "The ID of the patient for this booking",
};

/**
 * Practitioner ID field for booking creation (API uses 'doctor')
 * @constant {INodeProperties}
 */
export const DOCTOR_ID_FIELD: INodeProperties = {
  displayName: "Doctor ID",
  name: "doctor",
  type: "string",
  required: true,
  displayOptions: {
    show: {
      action: ["create"],
      resource: ["booking"],
    },
  },
  default: "",
  placeholder: "e.g., 62e2b7d228ec4b0013179e67",
  description: "The ID of the doctor/practitioner for this booking",
};

/**
 * Location ID field for booking creation
 * @constant {INodeProperties}
 */
export const LOCATION_ID_FIELD: INodeProperties = {
  displayName: "Location ID",
  name: "location",
  type: "string",
  required: true,
  displayOptions: {
    show: {
      action: ["create"],
      resource: ["booking"],
    },
  },
  default: "",
  placeholder: "e.g., 62e2b7d228ec4b0013179e67",
  description: "The ID of the location for this booking",
};

/**
 * Booking Type ID field for booking creation
 * @constant {INodeProperties}
 */
export const BOOKING_TYPE_ID_FIELD: INodeProperties = {
  displayName: "Booking Type ID",
  name: "bookingType",
  type: "string",
  required: true,
  displayOptions: {
    show: {
      action: ["create"],
      resource: ["booking"],
    },
  },
  default: "",
  placeholder: "e.g., 62e2b7d228ec4b0013179e67",
  description: "The ID of the booking type for this booking",
};

/**
 * Start time field for booking creation
 * @constant {INodeProperties}
 */
export const START_TIME_FIELD: INodeProperties = {
  displayName: "Start Time",
  name: "start",
  type: "dateTime",
  required: true,
  displayOptions: {
    show: {
      action: ["create"],
      resource: ["booking"],
    },
  },
  default: "",
  description: "The start time for the booking in ISO 8601 format",
};

/**
 * End time field for booking creation
 * @constant {INodeProperties}
 */
export const END_TIME_FIELD: INodeProperties = {
  displayName: "End Time",
  name: "end",
  type: "dateTime",
  required: true,
  displayOptions: {
    show: {
      action: ["create"],
      resource: ["booking"],
    },
  },
  default: "",
  description: "The end time for the booking in ISO 8601 format",
};

/**
 * Comments field for booking creation
 * @constant {INodeProperties}
 */
export const COMMENTS_FIELD: INodeProperties = {
  displayName: "Comments",
  name: "comments",
  type: "string",
  displayOptions: {
    show: {
      action: ["create"],
      resource: ["booking"],
    },
  },
  typeOptions: {
    rows: 3,
  },
  default: "",
  description: "Additional comments or notes about the booking",
};

/**
 * Send cancellation messages field for booking deletion
 * @constant {INodeProperties}
 */
export const SEND_CANCELLATION_MESSAGES_FIELD: INodeProperties = {
  displayName: "Send Cancellation Messages",
  name: "sendCancellationMessages",
  type: "boolean",
  displayOptions: {
    show: {
      action: ["delete"],
      resource: ["booking"],
    },
  },
  default: false,
  description: "Whether to send cancellation messages to the patient and practitioner",
};

/**
 * Duration field for booking creation
 * @constant {INodeProperties}
 */
export const DURATION_FIELD: INodeProperties = {
  displayName: "Duration (minutes)",
  name: "duration",
  type: "number",
  required: true,
  displayOptions: {
    show: {
      action: ["create"],
      resource: ["booking"],
    },
  },
  default: 60,
  typeOptions: {
    minValue: 1,
    maxValue: 480, // 8 hours
  },
  description: "The duration of the booking in minutes",
};

/**
 * Additional fields collection for booking creation
 * @constant {INodeProperties}
 */
export const ADDITIONAL_FIELDS: INodeProperties = {
  displayName: "Additional Fields",
  name: "additionalFields",
  type: "collection",
  placeholder: "Add Field",
  default: {},
  displayOptions: {
    show: {
      action: ["create"],
      resource: ["booking"],
    },
  },
  options: [
    {
      displayName: "Status",
      name: "status",
      type: "options",
      options: [
        {
          name: "Pending",
          value: "pending",
          description: "Booking is pending confirmation",
        },
        {
          name: "Confirmed",
          value: "confirmed",
          description: "Booking is confirmed",
        },
        {
          name: "Cancelled",
          value: "cancelled",
          description: "Booking has been cancelled",
        },
        {
          name: "Completed",
          value: "completed",
          description: "Booking has been completed",
        },
        {
          name: "No Show",
          value: "no_show",
          description: "Patient did not show up",
        },
      ],
      default: "pending",
      description: "The status of the booking",
    },
    {
      displayName: "End Time",
      name: "endTime",
      type: "dateTime",
      default: "",
      description: "The end time for the booking (if different from start time + duration)",
    },
    {
      displayName: "Notes",
      name: "notes",
      type: "string",
      typeOptions: {
        rows: 3,
      },
      default: "",
      description: "Additional notes or comments about the booking",
    },
    {
      displayName: "Reference Number",
      name: "referenceNumber",
      type: "string",
      default: "",
      description: "External reference number for the booking",
    },
    {
      displayName: "Priority",
      name: "priority",
      type: "options",
      options: [
        {
          name: "Low",
          value: "low",
        },
        {
          name: "Normal",
          value: "normal",
        },
        {
          name: "High",
          value: "high",
        },
        {
          name: "Urgent",
          value: "urgent",
        },
      ],
      default: "normal",
      description: "The priority level of the booking",
    },
    {
      displayName: "Reminder Enabled",
      name: "reminderEnabled",
      type: "boolean",
      default: true,
      description: "Whether to send reminder notifications for this booking",
    },
    {
      displayName: "Online Booking",
      name: "onlineBooking",
      type: "boolean",
      default: false,
      description: "Whether this booking was made online",
    },
  ],
  description: "Additional fields for the booking",
};

/**
 * Update fields collection for booking updates
 * @constant {INodeProperties}
 */
export const UPDATE_FIELDS: INodeProperties = {
  displayName: "Update Fields",
  name: "updateFields",
  type: "collection",
  placeholder: "Add Field",
  default: {},
  displayOptions: {
    show: {
      action: ["update"],
      resource: ["booking"],
    },
  },
  options: [
    {
      displayName: "Status",
      name: "status",
      type: "options",
      options: [
        {
          name: "Pending",
          value: "pending",
          description: "Booking is pending confirmation",
        },
        {
          name: "Confirmed",
          value: "confirmed",
          description: "Booking is confirmed",
        },
        {
          name: "Cancelled",
          value: "cancelled",
          description: "Booking has been cancelled",
        },
        {
          name: "Completed",
          value: "completed",
          description: "Booking has been completed",
        },
        {
          name: "No Show",
          value: "no_show",
          description: "Patient did not show up",
        },
      ],
      default: "",
      description: "Update the status of the booking",
    },
    {
      displayName: "Start Time",
      name: "startTime",
      type: "dateTime",
      default: "",
      description: "Update the start time for the booking",
    },
    {
      displayName: "End Time",
      name: "endTime",
      type: "dateTime",
      default: "",
      description: "Update the end time for the booking",
    },
    {
      displayName: "Duration (minutes)",
      name: "duration",
      type: "number",
      typeOptions: {
        minValue: 1,
        maxValue: 480,
      },
      default: 0,
      description: "Update the duration of the booking in minutes",
    },
    {
      displayName: "Notes",
      name: "notes",
      type: "string",
      typeOptions: {
        rows: 3,
      },
      default: "",
      description: "Update notes or comments about the booking",
    },
    {
      displayName: "Priority",
      name: "priority",
      type: "options",
      options: [
        {
          name: "Low",
          value: "low",
        },
        {
          name: "Normal",
          value: "normal",
        },
        {
          name: "High",
          value: "high",
        },
        {
          name: "Urgent",
          value: "urgent",
        },
      ],
      default: "",
      description: "Update the priority level of the booking",
    },
    {
      displayName: "Reminder Enabled",
      name: "reminderEnabled",
      type: "boolean",
      default: false,
      description: "Update whether to send reminder notifications",
    },
  ],
  description: "Fields to update for the booking",
};

/**
 * Options for booking getMany operation
 * @constant {INodeProperties}
 */
export const BOOKING_OPTIONS: INodeProperties = {
  displayName: "Options",
  name: "options",
  type: "collection",
  placeholder: "Add Option",
  default: {},
  displayOptions: {
    show: {
      action: ["getMany"],
      resource: ["booking"],
    },
  },
  options: [
    {
      displayName: "Limit",
      name: "limit",
      type: "number",
      typeOptions: {
        minValue: 1,
        maxValue: 1000,
      },
      default: 100,
      description: "Maximum number of bookings to return",
    },
    {
      displayName: "Return All",
      name: "returnAll",
      type: "boolean",
      default: false,
      description: "Whether to return all bookings or limit to the specified number",
    },
    {
      displayName: "Start Date",
      name: "startDate",
      type: "dateTime",
      default: "",
      description: "Filter bookings starting from this date",
    },
    {
      displayName: "End Date",
      name: "endDate",
      type: "dateTime",
      default: "",
      description: "Filter bookings ending before this date",
    },
    {
      displayName: "Status",
      name: "status",
      type: "options",
      options: [
        {
          name: "All",
          value: "",
        },
        {
          name: "Pending",
          value: "pending",
        },
        {
          name: "Confirmed",
          value: "confirmed",
        },
        {
          name: "Cancelled",
          value: "cancelled",
        },
        {
          name: "Completed",
          value: "completed",
        },
        {
          name: "No Show",
          value: "no_show",
        },
      ],
      default: "",
      description: "Filter bookings by status",
    },
    {
      displayName: "Patient ID",
      name: "patientId",
      type: "string",
      default: "",
      description: "Filter bookings for a specific patient",
    },
    {
      displayName: "Practitioner ID",
      name: "practitionerId",
      type: "string",
      default: "",
      description: "Filter bookings for a specific practitioner",
    },
    {
      displayName: "Location ID",
      name: "locationId",
      type: "string",
      default: "",
      description: "Filter bookings for a specific location",
    },
    {
      displayName: "Booking Type ID",
      name: "bookingTypeId",
      type: "string",
      default: "",
      description: "Filter bookings for a specific booking type",
    },
  ],
  description: "Additional options for retrieving bookings",
};

/**
 * All booking field descriptions grouped by operation
 */
export const BOOKING_FIELDS: INodeProperties[] = [
  BOOKING_ID_FIELD,
  PATIENT_ID_FIELD,
  DOCTOR_ID_FIELD,
  LOCATION_ID_FIELD,
  BOOKING_TYPE_ID_FIELD,
  START_TIME_FIELD,
  END_TIME_FIELD,
  COMMENTS_FIELD,
  SEND_CANCELLATION_MESSAGES_FIELD,
  DURATION_FIELD,
  ADDITIONAL_FIELDS,
  UPDATE_FIELDS,
  BOOKING_OPTIONS,
];

/**
 * Booking trigger options for the trigger node
 * @constant {INodeProperties}
 */
export const BOOKING_TRIGGER_OPTIONS: INodeProperties = {
  displayName: "Trigger Options",
  name: "triggerOptions",
  type: "collection",
  placeholder: "Add Option",
  default: {},
  options: [
    {
      displayName: "Patient ID",
      name: "patientId",
      type: "string",
      default: "",
      description: "Only trigger for bookings of a specific patient",
    },
    {
      displayName: "Practitioner ID",
      name: "practitionerId",
      type: "string",
      default: "",
      description: "Only trigger for bookings of a specific practitioner",
    },
    {
      displayName: "Location ID",
      name: "locationId",
      type: "string",
      default: "",
      description: "Only trigger for bookings at a specific location",
    },
    {
      displayName: "Booking Type ID",
      name: "bookingTypeId",
      type: "string",
      default: "",
      description: "Only trigger for bookings of a specific type",
    },
    {
      displayName: "Limit",
      name: "limit",
      type: "number",
      typeOptions: {
        minValue: 1,
        maxValue: 100,
      },
      default: 50,
      description: "Maximum number of bookings to process per trigger",
    },
  ],
  description: "Additional options for the booking trigger",
};

/**
 * Event type selector for booking trigger
 * @constant {INodeProperties}
 */
export const EVENT_TYPE_FIELD: INodeProperties = {
  displayName: "Event Type",
  name: "eventType",
  type: "options",
  options: [
    {
      name: "Any Change",
      value: "any",
      description: "Trigger on any booking change (created, updated, status changed)",
    },
    {
      name: "Created",
      value: "created",
      description: "Trigger only when new bookings are created",
    },
    {
      name: "Updated",
      value: "updated",
      description: "Trigger only when bookings are updated",
    },
    {
      name: "Confirmed",
      value: "confirmed",
      description: "Trigger only when bookings are confirmed",
    },
    {
      name: "Cancelled",
      value: "cancelled",
      description: "Trigger only when bookings are cancelled",
    },
  ],
  default: "any",
  description: "The type of booking event to trigger on",
};
