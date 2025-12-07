# Library Management System

A modern, role-based library management system built with Next.js, TypeScript, and Tailwind CSS.

## Features

### 🔐 Role-Based Authentication
- **Student Role**: Browse books, manage borrowed items, view reading history
- **Librarian Role**: Manage books, members, transactions, and generate reports
- **Administrator Role**: User management, system settings, and comprehensive system oversight

### 🎯 Key Functionalities

#### Student Dashboard
- Personal dashboard with borrowing statistics
- **Browse, borrow, and return books**
- **Fine management and payment system**
- **Overdue book tracking**
- **Borrowing limits enforcement**
- View borrowed books and due dates
- Access reading history
- Student-specific information display

#### Librarian Dashboard
- **Library statistics overview** with real-time data
- **Book management (add, edit, update)** with full CRUD operations
- **Student management (view, edit, suspend)** with account controls
- **Transaction processing** with working return/renew actions
- **Quick return processing** modal for fast book returns
- **Enhanced reports & analytics** with export functionality
- **Fine management** and overdue book handling
- **Book renewal** functionality for active loans
- **Member registration** and management
- **Transaction tracking** with status updates

#### Administrator Dashboard
- **Full system control and oversight**
- **Book management (add, edit, delete)**
- **User management across all roles**
- **Student account management**
- **Librarian account management (add, edit, delete, permissions)**
- **Google Books API integration for book suggestions**
- System configuration and settings
- Performance monitoring
- Comprehensive system reports

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd library-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Authentication Flow

### **Complete User Journey**
1. **New Users**: Must sign up first to create an account
2. **Account Creation**: After successful signup, users are redirected to signin
3. **Authentication**: Users must sign in with their credentials and role
4. **Role-Based Access**: After signin, users are automatically redirected to their role-specific dashboard

### **Sign Up Process**
1. Navigate to the signup page
2. Fill in your details and select your role
3. For students: provide student ID and department
4. Create your account → **Automatic redirect to signin page**

### **Sign In Process**
1. Go to the signin page
2. Enter your email, password, and role
3. **Automatic redirect to role-specific dashboard**

### **Role-Based Access**
- **Students**: Access student dashboard with book browsing and borrowing features
- **Librarians**: Access librarian dashboard with library management tools
- **Administrators**: Access admin dashboard with system-wide controls

### **Security Features**
- **Authentication Required**: All dashboard routes are protected
- **Role Verification**: Users can only access their assigned role dashboard
- **Automatic Redirects**: Unauthorized access attempts redirect to signin
- **Session Persistence**: Users stay logged in until they sign out

## 🏗️ Project Structure

```
app/
├── admin/dashboard/          # Administrator dashboard
├── librarian/dashboard/      # Librarian dashboard  
├── student/dashboard/        # Student dashboard
├── components/               # Reusable components
│   └── ProtectedRoute.tsx   # Role-based access control
├── signin/                   # Sign in page
├── signup/                   # Sign up page
└── models/                   # Data models
    └── User.js              # User schema
```

## 🔒 Security Features

- **Complete Authentication Flow**: Signup → Signin → Role-based Dashboard
- **Role-based Access Control**: Each role sees only relevant features
- **Protected Routes**: Unauthorized access prevention with automatic redirects
- **Session Management**: Secure user authentication with localStorage
- **Input Validation**: Form validation and error handling
- **Authentication Guards**: Automatic route protection and role verification

## 📚 Enhanced Book Management

### **Admin Capabilities**
- Add, edit, and delete books
- Manage book inventory and locations
- Set book categories and metadata
- Full system oversight

### **Librarian Capabilities**
- Add and edit books
- Update book information
- Manage book availability
- Process student requests

### **Student Capabilities**
- Browse available books
- Borrow books (with limits)
- Return books
- Pay overdue fines
- Track borrowing history

## 👥 User Management System

### **Admin Capabilities**
- Create and manage all user accounts
- Suspend/activate student accounts
- Manage librarian permissions
- Full user oversight

### **Librarian Capabilities**
- View and edit student information
- Suspend/activate student accounts
- Process student requests
- Manage student fines

## 💰 Fine Management System

- **Automatic fine calculation** ($0.50 per day overdue)
- **Fine payment processing**
- **Overdue book restrictions**
- **Borrowing limit enforcement** (5 books max)
- **Fine tracking and history**

## 👨‍💼 Librarian Management System

### **Admin Capabilities**
- **Create and manage librarian accounts**
- **Set access levels** (Junior, Standard, Senior)
- **Configure permissions** (Book Management, Student Management, Transactions, Reports, System Settings)
- **Monitor librarian activity** and last login times
- **Suspend/activate librarian accounts**
- **Department assignment** and management

### **Permission System**
- **Book Management**: Add, edit, and update books
- **Student Management**: View, edit, and suspend student accounts
- **Transactions**: Process book borrowing and returns
- **Reports**: Generate library reports and statistics
- **System Settings**: Configure library policies (admin only)

## 🌐 Google Books API Integration

### **Book Discovery Features**
- **Advanced Search**: By title, author, ISBN, or category
- **Book Covers**: High-quality thumbnail images
- **Ratings & Reviews**: User ratings and review counts
- **Detailed Metadata**: Publication dates, page counts, publishers
- **Popular Books**: Trending titles in Computer Science
- **New Releases**: Latest published books

### **Integration Benefits**
- **Rich Book Information**: Comprehensive book details
- **Professional Covers**: High-quality book cover images
- **User Ratings**: Community-driven book recommendations
- **Easy Addition**: One-click book addition to library
- **External Links**: Direct links to Google Books for more info

## 🎨 UI/UX Features

- Modern, responsive design
- Role-specific color schemes
- Interactive navigation
- Clean and intuitive interface
- Mobile-friendly layout

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks
- **Routing**: Next.js App Router

## 📝 Notes

- This is a demo application using localStorage for data persistence
- In production, implement proper backend authentication and database storage
- Add password hashing and proper security measures
- Implement real-time notifications and updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support or questions, please open an issue in the repository.
# Library-Management-System
# Library-Management-System
