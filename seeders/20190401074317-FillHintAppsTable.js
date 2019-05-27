"use strict";

module.exports = {"up": (queryInterface) => queryInterface.bulkInsert("hintApps", [
    {
        "escapeRoomId": 1,
        "public_id": "escapeRoom/attachments/idrxxae96xldmvzgpf9e",
        "url": "https://res.cloudinary.com/dbrbgqgfg/raw/upload/v1554105049/escapeRoom/attachments/idrxxae96xldmvzgpf9e",
        "filename": "react.xml",
        "mime": "text/xml",
        "createdAt": new Date(),
        "updatedAt": new Date()
    }

]),

"down": (queryInterface) => queryInterface.bulkDelete("hintApps", null, {})};
