import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import axios from 'axios'; // require o'rniga shu yoziladi
import { sweets } from "./data/sweets.js";
import { snack } from "./data/snack.js";
import { foods } from "./data/foods.js";
import { drinks } from "./data/drinks.js";

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

// --- BAZA BILAN ALOQA ---
mongoose.connect("mongodb://localhost:27017/restoran_db")
  .then(() => console.log("Baza bilan aloqa o'rnatildi! ✅"))
  .catch((err) => console.error("Bazaga ulanishda xato: ❌", err));

// 1. MAHSULOTLAR UCHUN MODEL
const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  img: String,  
  category: String
});
const Product = mongoose.model("Product", ProductSchema);

// 2. BUYURTMALAR UCHUN MODEL
const OrderSchema = new mongoose.Schema({
  items: Array,
  totalPrice: Number,
  date: { type: Date, default: Date.now }
});
const Order = mongoose.model("Order", OrderSchema);

// --- MA'LUMOTLARNI KO'CHIRISH ---
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

// A. BUYURTMALAR (POST /orders/new)
// Bu yo'l har doim tepada turishi kerak
app.post("/orders/new", async (req, res) => {
  try {
    const { customer, items, totalPrice } = req.body;

    const BOT_TOKEN = "7576774344:AAEPGGsQZwHku5xxGwTcGMXbu0QMESQ_9BM"; 
    const CHAT_ID = "7878545674";

    let message = `🚀 <b>YANGI BUYURTMA!</b>\n\n`;
    message += `👤 <b>Mijoz:</b> ${customer?.name || "Noma'lum"}\n`;
    message += `📞 <b>Tel:</b> ${customer?.phone || "Noma'lum"}\n`;
    message += `📍 <b>Manzil:</b> ${customer?.address || "Ko'rsatilmagan"}\n\n`;
    message += `🛒 <b>Mahsulotlar:</b>\n`;

    items.forEach((item, index) => {
      message += `${index + 1}. ${item.name} x ${item.quantity} dona\n`;
    });

    message += `\n💰 <b>JAMI:</b> ${totalPrice.toLocaleString()} so'm`;

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "HTML"
    });

    res.status(200).json({ message: "Buyurtma Telegramga yuborildi!" });
  } catch (error) {
    console.error("Telegram Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Xabar yuborishda xatolik!" });
  }
});

// B. KATEGORIYA BO'YICHA OLISH
app.get("/:category", async (req, res) => {
  try {
    const { category } = req.params;
    if (category === "orders") return res.status(400).send("Invalid route"); 
    const data = await Product.find({ category: category });
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

// D. NARXNI NOMI BO'YICHA YANGILASH
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

// G. O'CHIRISH
app.delete("/:category/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "O'chirildi" });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`Server yondi: http://localhost:${PORT} 🚀`));