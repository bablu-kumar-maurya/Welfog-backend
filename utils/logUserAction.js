



// const UserLog = require("../models/UserLog");

// const logUserAction = async ({
//     user,
//     userName = null,      // ✅ added
//     userRole = null,      // ✅ added
//     action,
//     targetType = null,
//     targetId = null,
//     device = null,
//     browser = null,       // ✅ added
//     location = {},
//     metadata = {}         // ✅ added
// }) => {
//     try {
//         const logEntry = new UserLog({
//             user,
//             action,
//             targetType,
//             targetId,
//             device,
//             browser,
//             location,

//             // ✅ store extra info safely
//             metadata: {
//                 ...metadata,
//                 userName,
//                 userRole
//             }
//         });

//         await logEntry.save();
//     } catch (error) {
//         console.error("Error logging user action:", error);
//         // Avoid crashing the app — fail silently
//     }
// };

// module.exports = logUserAction;



const UserLog = require("../models/UserLog");

const logUserAction = async ({
    user,
    userName = null,
    userRole = null,
    action,
    targetType = null,
    targetId = null,
    targetName = null,
    device = null,
    browser = null,
    location = {},
    metadata = {}
}) => {
    try {
        const logEntry = new UserLog({
            user,
            action,
            targetType,
            targetId,
            targetName,
            device,
            browser,
            location,

            metadata: {
                ...metadata,

                // ✅ ALWAYS STRING (frontend safe)
                userName: userName || null,

                userRole:
                    typeof userRole === "string"
                        ? userRole
                        : userRole?.name || null
            }
        });

        await logEntry.save();
    } catch (error) {
        console.error("Error logging user action:", error.message);
    }
};

module.exports = logUserAction;

