require('dotenv').config({path: '.env.local'});
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    const now = new Date();
    const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
    const istNow = new Date(istMs);
    istNow.setUTCHours(0, 0, 0, 0);
    const todayLunch = new Date(istNow.getTime() - 5.5 * 60 * 60 * 1000);
    
    // Admin stats logic
    const adminRedeemedToday = await db.collection('coupons').countDocuments({ status: 'redeemed', validForDate: todayLunch });
    const adminPaidToday = await db.collection('coupons').countDocuments({ status: { $in: ['active', 'redeemed', 'transferred', 'expired'] }, validForDate: todayLunch });
    
    console.log('ADMIN:');
    console.log('redeemedToday:', adminRedeemedToday);
    console.log('paidToday:', adminPaidToday);
    
    // Canteen stats logic
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayISTStartUTC = new Date(istNow);
    todayISTStartUTC.setUTCHours(0, 0, 0, 0);
    const todayISTStart = new Date(todayISTStartUTC.getTime() - istOffset);
    
    const todayISTEndUTC = new Date(istNow);
    todayISTEndUTC.setUTCHours(23, 59, 59, 999);
    const todayISTEnd = new Date(todayISTEndUTC.getTime() - istOffset);

    const todayRedeemedCount = await db.collection('coupons').countDocuments({
        redeemedAt: { $gte: todayISTStart, $lt: todayISTEnd },
        status: 'redeemed'
    });
    
    const todayStartUTC = new Date(todayLunch);
    const todayEndUTC = new Date(todayLunch.getTime() + 24 * 60 * 60 * 1000);
    
    const todayPaidCouponsCount = await db.collection('coupons').countDocuments({
        validForDate: { $gte: todayStartUTC, $lt: todayEndUTC },
        status: { $in: ['active', 'redeemed', 'transferred', 'expired'] }
    });

    console.log('CANTEEN:');
    console.log('todayRedeemedCount:', todayRedeemedCount);
    console.log('todayPaidCouponsCount:', todayPaidCouponsCount);
    
    process.exit(0);
});
