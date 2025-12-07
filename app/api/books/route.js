import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Book from "../../models/Book";

export async function GET(req) {
  try {
    await dbConnect();
    
    const books = await Book.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json({ books });
  } catch (err) {
    console.error("Get books error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { 
      title, 
      author, 
      isbn, 
      category, 
      description, 
      totalCopies, 
      location, 
      addedBy,
      imageUrl,
      rating,
      ratingsCount,
      pageCount,
      language,
      publishedYear,
      publisher
    } = await req.json();
    
    if (!title || !author || !isbn || !category) {
      return NextResponse.json({ error: "Title, author, ISBN, and category are required" }, { status: 400 });
    }

    await dbConnect();

    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      return NextResponse.json({ error: "Book with this ISBN already exists" }, { status: 400 });
    }
    
    const bookData = {
      title,
      author,
      isbn,
      category,
      description: description || "",
      totalCopies: totalCopies || 1,
      availableCopies: totalCopies || 1,
      location: location || "",
      status: "available",
      imageUrl: imageUrl || "",
      rating: rating || 0,
      ratingsCount: ratingsCount || 0,
      pageCount: pageCount || 0,
      language: language || "en",
      publishedYear: publishedYear || null,
      publisher: publisher || "",
      addedBy: addedBy || null,
      addedDate: new Date(),
      lastUpdated: new Date()
    };

    const book = await Book.create(bookData);
    
    return NextResponse.json({ 
      message: "Book created successfully",
      book
    }, { status: 201 });
  } catch (err) {
    console.error("Create book error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
