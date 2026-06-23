/**
 * Lead.js — Mongoose schema and model.
 *
 * A schema is the blueprint that defines what data a document can have
 * and enforces validation at the database level (not just in our validator).
 *
 * This model replaces the in-memory array from Week 2 — same shape, real persistence.
 * Data survives server restarts because it lives in MongoDB.
 *
 * Schema Design decisions:
 * - email: unique: true  → MongoDB enforces no duplicates at the index level
 * - timestamps: true     → Mongoose auto-adds createdAt and updatedAt
 * - toJSON: { virtuals, transform } → clean output (no __v, id alias for _id)
 */

const mongoose = require('mongoose');

const TEAM_SIZE_ENUM = ['1', '2-10', '11-50', '51-200', '200+'];
const STATUS_ENUM    = ['new', 'contacted', 'converted', 'rejected'];

const leadSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required.'],
      trim:      true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [80, 'Name must be 80 characters or fewer.'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required.'],
      unique:    true,              // MongoDB index — duplicate → code 11000
      lowercase: true,
      trim:      true,
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'A valid email address is required.'],
      maxlength: [254, 'Email must be 254 characters or fewer.'],
    },
    company: {
      type:      String,
      trim:      true,
      maxlength: [100, 'Company must be 100 characters or fewer.'],
      default:   '',
    },
    teamSize: {
      type:    String,
      enum:    { values: TEAM_SIZE_ENUM, message: 'Team size must be one of: 1, 2-10, 11-50, 51-200, 200+.' },
      default: '',
    },
    useCase: {
      type:      String,
      trim:      true,
      maxlength: [500, 'Use case must be 500 characters or fewer.'],
      default:   '',
    },
    status: {
      type:    String,
      enum:    { values: STATUS_ENUM, message: 'Status must be one of: new, contacted, converted, rejected.' },
      default: 'new',
    },
    source: {
      type:      String,
      trim:      true,
      maxlength: [50, 'Source must be 50 characters or fewer.'],
      default:   'website',
    },
  },
  {
    timestamps: true,       // auto createdAt + updatedAt
    toJSON: {
      virtuals: true,
      versionKey: false,              // drops __v at the schema level
      transform(doc, ret) {
        ret.id = ret._id.toString();  // expose id as a plain string
        delete ret._id;               // never expose Mongo's internal _id
        delete ret.__v;               // belt-and-suspenders (versionKey:false covers it)
      },
    },
  }
);

module.exports = mongoose.model('Lead', leadSchema);
