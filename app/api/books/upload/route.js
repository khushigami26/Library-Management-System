import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import dbConnect from '@/lib/db';
import Book from '../../../models/Book';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(req) {
  try {
    // Start database connection and form data parsing in parallel
    const [_, formData] = await Promise.all([
      dbConnect(),
      req.formData()
    ]);

    // Extract all form data at once
    const bookData = {
      title: formData.get('title'),
      author: formData.get('author'),
      isbn: formData.get('isbn')?.replace(/-/g, ''), // Clean ISBN immediately
      category: formData.get('category'),
      totalCopies: parseInt(formData.get('totalCopies')) || 1,
      location: formData.get('location'),
      addedBy: formData.get('addedBy'),
      image: formData.get('image')
    };

    // Validate all required fields at once
    const missingFields = ['title', 'author', 'isbn', 'category'].filter(
      field => !bookData[field]
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          fields: missingFields 
        },
        { status: 400 }
      );
    }

    // Validate ISBN format (basic validation)
    const isbnRegex = /^(?:\d{10}|\d{13})$/;
    if (!isbnRegex.test(bookData.isbn)) {
      return NextResponse.json(
        { error: 'Invalid ISBN format. Must be 10 or 13 digits.' },
        { status: 400 }
      );
    }

    // Check for existing book with same ISBN
    const existingBook = await Book.findOne(
      { isbn: bookData.isbn },
      { title: 1, author: 1, isbn: 1 } // Only fetch needed fields
    ).lean(); // Use lean() for better performance

    if (existingBook) {
      return NextResponse.json(
        { 
          error: 'A book with this ISBN already exists',
          existingBook
        },
        { status: 409 }
      );
    }

    // Handle image upload in parallel with book creation if provided
    let imageUploadPromise = Promise.resolve(null);
    
    if (bookData.image?.size > 0) {
      imageUploadPromise = (async () => {
        try {
          const bytes = await bookData.image.arrayBuffer();
          const buffer = Buffer.from(bytes);

          return await uploadImage({
            buffer,
            mimetype: bookData.image.type,
            isbn: bookData.isbn // Pass ISBN for better file organization
          });
        } catch (error) {
          console.error('Image upload error:', error);
          return null;
        }
      })();
    }

    // Process image upload and book creation in parallel
    const [imageResult] = await Promise.all([
      imageUploadPromise
    ]);

    // Create book document
    const book = new Book({
      title: bookData.title,
      author: bookData.author,
      isbn: bookData.isbn,
      category: bookData.category,
      totalCopies: bookData.totalCopies,
      availableCopies: bookData.totalCopies,
      location: bookData.location,
      addedBy: bookData.addedBy,
      imageUrl: imageResult?.url || null,
      cloudinaryPublicId: imageResult?.publicId || null,
      status: 'available',
    });

    // Save book with timeout and optimizations
    const savedBook = await Promise.race([
      book.save(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out')), 10000)
      )
    ]);

    // Return minimal book data in response
    return NextResponse.json({
      message: 'Book added successfully',
      book: {
        id: savedBook._id,
        title: savedBook.title,
        author: savedBook.author,
        isbn: savedBook.isbn,
        category: savedBook.category
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Book upload error:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          error: 'A book with this ISBN already exists',
          details: 'Please check the ISBN and try again, or update the existing book.'
        },
        { status: 409 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          error: 'Invalid book data',
          details: Object.values(error.errors).map(err => err.message)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add book. Please try again.' },
      { status: 500 }
    );
  }
}
