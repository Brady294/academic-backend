module.exports = function (io) {

    io.on("connection", (socket) => {

        console.log(`🟢 Socket connected: ${socket.id}`);

        // ==========================
        // JOIN ORDER ROOM
        // ==========================

        socket.on("join-order", (orderId) => {

            if (!orderId) return;

            const room = `order_${orderId}`;

            socket.join(room);

            console.log(
                `${socket.id} joined ${room}`
            );

        });

        // ==========================
        // LEAVE ORDER ROOM
        // ==========================

        socket.on("leave-order", (orderId) => {

            if (!orderId) return;

            const room = `order_${orderId}`;

            socket.leave(room);

            console.log(
                `${socket.id} left ${room}`
            );

        });

        // ==========================
        // USER TYPING
        // ==========================

        socket.on("typing", ({ orderId, user }) => {

            if (!orderId) return;

            socket.to(`order_${orderId}`).emit(
                "typing",
                {
                    orderId,
                    user,
                }
            );

        });

        // ==========================
        // STOP TYPING
        // ==========================

        socket.on("stop-typing", ({ orderId }) => {

            if (!orderId) return;

            socket.to(`order_${orderId}`).emit(
                "stop-typing",
                {
                    orderId,
                }
            );

        });

        // ==========================
        // DISCONNECT
        // ==========================

        socket.on("disconnect", () => {

            console.log(
                `🔴 Socket disconnected: ${socket.id}`
            );

        });

    });

};