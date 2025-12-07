import mongoose from "mongoose";

const BookSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be longer than 200 characters']
  },
  author: { 
    type: String, 
    required: [true, 'Author is required'],
    trim: true,
    maxlength: [100, 'Author name cannot be longer than 100 characters']
  },
  isbn: { 
    type: String, 
    required: [true, 'ISBN is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Remove hyphens and validate length
        const cleanIsbn = v.replace(/-/g, '');
        return /^(?:\d{10}|\d{13})$/.test(cleanIsbn);
      },
      message: props => `${props.value} is not a valid ISBN!`
    }
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'],
    trim: true
  },
  // description: String,
  // publishedYear: Number,
  // publisher: String,
  totalCopies: { 
    type: Number, 
    default: 1,
    min: [1, 'Total copies must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value'
    }
  },
  availableCopies: { 
    type: Number, 
    default: 1,
    min: [0, 'Available copies cannot be negative'],
    validate: {
      validator: function(v) {
        return v <= this.totalCopies;
      },
      message: 'Available copies cannot exceed total copies'
    }
  },
  location: String,
  status: { type: String, enum: ['available', 'borrowed', 'reserved', 'maintenance'], default: 'available' },
  imageUrl: String, // Google Books API image URL
  rating: Number, // Google Books API rating
  ratingsCount: Number, // Google Books API ratings count
  pageCount: Number, // Google Books API page count
  language: String, // Google Books API language
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedDate: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.models.Book || mongoose.model("Book", BookSchema);
