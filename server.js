

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { sweets } from "./data/sweets.js";
import { snack } from "./data/snack.js";
import { foods } from "./data/foods.js";
import { drinks } from "./data/drinks.js";

const app = express();
    

app.use(express.json());
app.use(cors());

// --- BAZA BILAN ALOQA ---
// server.js ichida ulanish qismini shunga almashtiring:
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/restoran_db";

mongoose.connect(mongoURI)
  .then(() => console.log("Baza bilan aloqa o'rnatildi! ✅"))
  .catch((err) => console.error("Bazaga ulanishda xato: ❌", err));

// PORT qismini ham shunday yozing:
const PORT = process.env.PORT || 5000;

// 1. MAHSULOTLAR UCHUN MODEL
const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  img: String,  
  category: String
});
const Product = mongoose.model("Product", ProductSchema);

// 2. BUYURTMALAR UCHUN MODEL (YANGI!)
const OrderSchema = new mongoose.Schema({
  items: Array,
  totalPrice: Number,
  date: { type: Date, default: Date.now }
});
const Order = mongoose.model("Order", OrderSchema);

// --- MA'LUMOTLARNI KO'CHIRISH (AGAR BAZA BO'SH BO'LSA) ---
const importData = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      const allProducts = [
        ...foods.map(item => ({ name: item.name, price: Number(item.price), img: item.img, category: 'foods' })),
        ...sweets.map(item => ({ name: item.name, price: Number(item.price), img: item.img, category: 'sweets' })),
        ...drinks.map(item => ({ name: item.name, price: Number(item.price), img: item.img, category: 'drinks' })),
        ...snack.map(item => ({ name: item.name, price: Number(item.price), img: item.img, category: 'snack' }))
      ];
      await Product.insertMany(allProducts);
      console.log("Ma'lumotlar bazaga ko'chirildi! ✅");
    }
  } catch (err) { console.error(err); }
};
importData();

// --- API ROUTES ---

// A. BUYURTMALAR (TEPADA TURISHI SHART)
import axios from 'axios';

// Buyurtma qabul qilish va Telegramga yuborish
app.post("/orders/new", async (req, res) => {
  const { customer, items, totalPrice } = req.body;

  // SIZNING MA'LUMOTLARINGIZ (Rasmdan olingan)
  const BOT_TOKEN = "7576774344:AAEPGGsQZwHku5xxGwTcGMXbu0QMESQ_9BM"; 
  const CHAT_ID = "7878545674";

  // Telegram uchun chiroyli xabar matni
  let message = `🚀 <b>YANGI BUYURTMA!</b>\n\n`;
  message += `👤 <b>Mijoz:</b> ${customer.name}\n`;
  message += `📞 <b>Tel:</b> ${customer.phone}\n`;
  message += `📍 <b>Manzil:</b> ${customer.address || "Ko'rsatilmagan"}\n\n`;
  message += `🛒 <b>Mahsulotlar:</b>\n`;

  items.forEach((item, index) => {
    message += `${index + 1}. ${item.name} x ${item.quantity} dona\n`;
  });

  message += `\n💰 <b>JAMI:</b> ${totalPrice.toLocaleString()} so'm`;

  try {
    // Telegramga so'rov yuborish
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "HTML"
    });

    res.status(200).json({ message: "Buyurtma Telegramga yuborildi!" });
  } catch (error) {
    console.error("Telegram Error:", error);
    res.status(500).json({ error: "Xabar yuborishda xatolik!" });
  }
});

// B. KATEGORIYA BO'YICHA OLISH
app.get("/:category", async (req, res) => {
  try {
    if (req.params.category === "orders") return; 
    const data = await Product.find({ category: req.params.category });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// C. YANGI MAHSULOT QO'SHISH
app.post("/:category", async (req, res) => {
  try {
    const newProduct = new Product({ ...req.body, category: req.params.category });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// D. NARXNI NOMI BO'YICHA YANGILASH (UPDATE-SPECIAL)
app.put("/:category/update-special", async (req, res) => {
  try {
    const { name, price } = req.body;
    const updated = await Product.findOneAndUpdate(
      { category: req.params.category, name: name },
      { $set: { price: Number(price) } },
      { new: true }
    );
    if (updated) res.json(updated);
    else res.status(404).json({ message: "Mahsulot topilmadi" });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// E. ID BO'YICHA TO'LIQ TAHRIRLASH
app.put("/:category/update-by-id/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id, 
      { $set: req.body }, 
      { new: true }
    );
    if (updated) res.json(updated);
    else res.status(404).json({ message: "ID topilmadi" });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// F. OMMAVIY NARX YANGILASH
app.put("/:category/update-all-prices", async (req, res) => {
  try {
    const { price } = req.body;
    await Product.updateMany(
      { category: req.params.category }, 
      { $set: { price: Number(price) } }
    );
    res.json({ message: "Barcha narxlar yangilandi!" });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// G. O'CHIRISH (DELETE)
app.delete("/:category/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "O'chirildi" });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`Server yondi: http://localhost:${PORT} 🚀`));