import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Import models
import User from './models/User.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Transaction from './models/Transaction.js';
import Order from './models/Order.js';
import ContactMessage from './models/ContactMessage.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://farazabdullah267:SjgRgW3SlAAa05Rl@project.ifut3ay.mongodb.net/fashionhub?retryWrites=true&w=majority';

// Initialize database connection
async function initDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('Connected to MongoDB Atlas');
    await insertSampleData();
    console.log('Sample data inserted successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Failed to connect to MongoDB. Server will continue but database operations may fail.');
  }
}

// Insert sample data
async function insertSampleData() {
  try {
    // Check if data already exists
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Sample data already exists, skipping insertion');
      return;
    }

    // Create sample users
    const users = await User.insertMany([
      { name: 'Admin User', email: 'admin@admin.com', password: 'admin123', role: 'admin' },
      { name: 'Amir Khan', email: 'user@user.com', password: 'user123', role: 'user' }
    ]);

    // Create sample categories
    const categories = await Category.insertMany([
      { name: 'Shirts', description: 'Stylish shirts for all occasions' },
      { name: 'Pants', description: 'Comfortable and trendy pants' },
      { name: 'Shoes', description: 'Quality footwear for every style' }
    ]);

    // Create sample products
    const products = await Product.insertMany([
      {
        name: 'Classic White Shirt',
        description: 'Elegant white cotton shirt perfect for office and casual wear',
        price: 29.99,
        image_url: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg',
        stock: 50,
        category_id: categories[0]._id
      },
      {
        name: 'Blue Denim Jeans',
        description: 'Comfortable blue denim jeans with modern fit',
        price: 49.99,
        image_url: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg',
        stock: 35,
        category_id: categories[1]._id
      },
      {
        name: 'Black Leather Shoes',
        description: 'Premium black leather dress shoes for formal occasions',
        price: 89.99,
        image_url: 'https://images.pexels.com/photos/267301/pexels-photo-267301.jpeg',
        stock: 25,
        category_id: categories[2]._id
      }
    ]);

    // Create sample transactions
    await Transaction.insertMany([
      {
        user_id: users[1]._id,
        product_id: products[0]._id,
        quantity: 2,
        status: 'delivered',
        transaction_date: new Date('2024-01-15')
      },
      {
        user_id: users[1]._id,
        product_id: products[2]._id,
        quantity: 1,
        status: 'shipped',
        transaction_date: new Date('2024-01-20')
      }
    ]);

    console.log('Sample data inserted successfully');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

// Authentication Routes
app.post('/api/signup', async (req, res) => {
  const { name, email, password, role = 'user' } = req.body;

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Account already exists' });
    }

    // Create new user
    const newUser = new User({ name, email, password, role });
    await newUser.save();
    
    res.json({ user: newUser });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, password });
    if (user) {
      return res.json({ user });
    }

    res.status(401).json({ message: 'Account not found. Please sign up first.' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Product Routes
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().populate('category_id', 'name');
    // Convert ObjectId to number for compatibility
    const formattedProducts = products.map(product => ({
      id: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.image_url,
      stock: product.stock,
      category_id: product.category_id._id,
      created_at: product.createdAt
    }));
    res.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const product = await Product.findById(id).populate('category_id', 'name');
    if (product) {
      const formattedProduct = {
        id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        image_url: product.image_url,
        stock: product.stock,
        category_id: product.category_id._id,
        created_at: product.createdAt
      };
      res.json(formattedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, description, price, image_url, stock, category_id } = req.body;
  
  try {
    const newProduct = new Product({
      name,
      description,
      price: parseFloat(price),
      image_url,
      stock: parseInt(stock),
      category_id
    });
    
    await newProduct.save();
    await newProduct.populate('category_id', 'name');
    
    const formattedProduct = {
      id: newProduct._id,
      name: newProduct.name,
      description: newProduct.description,
      price: newProduct.price,
      image_url: newProduct.image_url,
      stock: newProduct.stock,
      category_id: newProduct.category_id._id,
      created_at: newProduct.createdAt
    };
    
    res.json(formattedProduct);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, image_url, stock, category_id } = req.body;
  
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        name,
        description,
        price: parseFloat(price),
        image_url,
        stock: parseInt(stock),
        category_id
      },
      { new: true }
    ).populate('category_id', 'name');
    
    if (updatedProduct) {
      const formattedProduct = {
        id: updatedProduct._id,
        name: updatedProduct.name,
        description: updatedProduct.description,
        price: updatedProduct.price,
        image_url: updatedProduct.image_url,
        stock: updatedProduct.stock,
        category_id: updatedProduct.category_id._id,
        created_at: updatedProduct.createdAt
      };
      res.json(formattedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (deletedProduct) {
      res.json({ message: 'Product deleted successfully' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Category Routes
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find();
    const formattedCategories = categories.map(category => ({
      id: category._id,
      name: category.name,
      description: category.description
    }));
    res.json(formattedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    let category, productsByCategory;

    if (id === '0') {
      // All products
      category = { id: 0, name: "All Products", description: "Browse all our products" };
      const products = await Product.find().populate('category_id', 'name');
      productsByCategory = products.map(product => ({
        id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        image_url: product.image_url,
        stock: product.stock,
        category_id: product.category_id._id
      }));
    } else {
      category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const products = await Product.find({ category_id: id }).populate('category_id', 'name');
      productsByCategory = products.map(product => ({
        id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        image_url: product.image_url,
        stock: product.stock,
        category_id: product.category_id._id
      }));

      category = {
        id: category._id,
        name: category.name,
        description: category.description
      };
    }

    res.json({ category, products: productsByCategory });
  } catch (error) {
    console.error('Error fetching category and products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name, description } = req.body;
  
  try {
    const newCategory = new Category({ name, description });
    await newCategory.save();
    
    const formattedCategory = {
      id: newCategory._id,
      name: newCategory.name,
      description: newCategory.description
    };
    
    res.json(formattedCategory);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description },
      { new: true }
    );
    
    if (updatedCategory) {
      const formattedCategory = {
        id: updatedCategory._id,
        name: updatedCategory.name,
        description: updatedCategory.description
      };
      res.json(formattedCategory);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (deletedCategory) {
      res.json({ message: 'Category deleted successfully' });
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User Routes (Admin only)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.createdAt
    }));
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('-password');
    
    if (updatedUser) {
      const formattedUser = {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        created_at: updatedUser.createdAt
      };
      res.json(formattedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Order Routes
app.get('/api/orders', async (req, res) => {
  const { user_id } = req.query;
  
  try {
    let query = {};
    if (user_id) {
      query.user_id = user_id;
    }
    
    const orders = await Order.find(query)
      .populate('user_id', 'name')
      .sort({ createdAt: -1 });
    
    const formattedOrders = orders.map(order => ({
      id: order._id,
      user_id: order.user_id._id,
      user_name: order.user_id.name,
      total_amount: order.total_amount,
      status: order.status,
      delivery_info: order.delivery_info,
      payment_method: order.payment_method,
      created_at: order.createdAt,
      items: order.items
    }));
    
    res.json(formattedOrders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/orders', async (req, res) => {
  const { user_id, items, delivery_info, payment_method, total_amount, status = 'ordered' } = req.body;
  
  try {
    const newOrder = new Order({
      user_id,
      total_amount: parseFloat(total_amount),
      status,
      delivery_info,
      payment_method,
      items: items.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    });
    
    await newOrder.save();
    res.json({ id: newOrder._id, message: 'Order placed successfully' });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('user_id', 'name');
    
    if (updatedOrder) {
      const formattedOrder = {
        id: updatedOrder._id,
        user_id: updatedOrder.user_id._id,
        user_name: updatedOrder.user_id.name,
        total_amount: updatedOrder.total_amount,
        status: updatedOrder.status,
        created_at: updatedOrder.createdAt,
        items: updatedOrder.items
      };
      res.json(formattedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Transaction Routes (Legacy - keeping for compatibility)
app.get('/api/transactions', async (req, res) => {
  const { user_id } = req.query;
  
  try {
    let query = {};
    if (user_id) {
      query.user_id = user_id;
    }
    
    const transactions = await Transaction.find(query)
      .populate('user_id', 'name')
      .populate('product_id', 'name price')
      .sort({ transaction_date: -1 });
    
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      user_id: transaction.user_id._id,
      product_id: transaction.product_id._id,
      quantity: transaction.quantity,
      status: transaction.status,
      transaction_date: transaction.transaction_date,
      user_name: transaction.user_id.name,
      product_name: transaction.product_id.name,
      price: transaction.product_id.price
    }));
    
    res.json(formattedTransactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { user_id, product_id, quantity } = req.body;
  
  try {
    const newTransaction = new Transaction({
      user_id,
      product_id,
      quantity: parseInt(quantity),
      status: 'ordered'
    });
    
    await newTransaction.save();
    await newTransaction.populate(['user_id', 'product_id']);
    
    const formattedTransaction = {
      id: newTransaction._id,
      user_id: newTransaction.user_id._id,
      product_id: newTransaction.product_id._id,
      quantity: newTransaction.quantity,
      status: newTransaction.status,
      transaction_date: newTransaction.transaction_date,
      user_name: newTransaction.user_id.name,
      product_name: newTransaction.product_id.name,
      price: newTransaction.product_id.price
    };
    
    res.json(formattedTransaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate(['user_id', 'product_id']);
    
    if (updatedTransaction) {
      const formattedTransaction = {
        id: updatedTransaction._id,
        user_id: updatedTransaction.user_id._id,
        product_id: updatedTransaction.product_id._id,
        quantity: updatedTransaction.quantity,
        status: updatedTransaction.status,
        transaction_date: updatedTransaction.transaction_date,
        user_name: updatedTransaction.user_id.name,
        product_name: updatedTransaction.product_id.name,
        price: updatedTransaction.product_id.price
      };
      res.json(formattedTransaction);
    } else {
      res.status(404).json({ message: 'Transaction not found' });
    }
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Contact Routes
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  try {
    const newMessage = new ContactMessage({
      name,
      email,
      subject,
      message
    });
    
    await newMessage.save();
    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Analytics Routes
app.get('/api/analytics', async (req, res) => {
  const { range = '6months' } = req.query;
  
  try {
    // Get actual data from MongoDB
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const orders = await Order.find();
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);

    // Mock analytics data for demo (you can enhance this with real aggregation)
    const analyticsData = {
      monthlyRevenue: [
        { month: 'Jan', revenue: 4500, orders: 45 },
        { month: 'Feb', revenue: 5200, orders: 52 },
        { month: 'Mar', revenue: 4800, orders: 48 },
        { month: 'Apr', revenue: 6100, orders: 61 },
        { month: 'May', revenue: 7300, orders: 73 },
        { month: 'Jun', revenue: 8200, orders: 82 }
      ],
      topProducts: [
        { name: 'Classic White Shirt', sales: 156, revenue: 4680 },
        { name: 'Blue Denim Jeans', sales: 134, revenue: 6698 },
        { name: 'Black Leather Shoes', sales: 98, revenue: 8820 },
        { name: 'Summer Dress', sales: 87, revenue: 3480 },
        { name: 'Casual Sneakers', sales: 76, revenue: 4560 }
      ],
      ordersByStatus: [
        { status: 'Delivered', count: 245, color: '#10B981' },
        { status: 'Shipped', count: 67, color: '#3B82F6' },
        { status: 'Ordered', count: 34, color: '#F59E0B' },
        { status: 'Cancelled', count: 12, color: '#EF4444' }
      ],
      totalStats: {
        totalRevenue,
        totalOrders,
        totalProducts,
        totalCustomers: totalUsers
      }
    };
    
    res.json(analyticsData);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Initialize database and start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('📧 Demo accounts:');
    console.log('   Admin: admin@admin.com / admin123');
    console.log('   User: user@user.com / user123');
    console.log('💾 Using MongoDB Atlas database');
  });
});