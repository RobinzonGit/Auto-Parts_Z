const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.setUserRole = functions.https.onCall(async (data, context) => {
  // 1. Проверяем, что пользователь авторизован
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Требуется авторизация."
    );
  }

  // 2. Проверяем, что вызывающий — администратор (по custom claims)
  if (context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Только администратор может менять роли."
    );
  }

  // 3. Валидируем входные данные
  const { uid, role } = data;
  if (!uid || !role) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Необходимо передать uid и role."
    );
  }

  const validRoles = ["user", "moderator", "admin"];
  if (!validRoles.includes(role)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Роль должна быть одной из: ${validRoles.join(", ")}`
    );
  }

  // 4. Устанавливаем custom claims для целевого пользователя
  try {
    await admin.auth().setCustomUserClaims(uid, { role });
    return { message: `Роль '${role}' успешно назначена пользователю ${uid}` };
  } catch (error) {
    console.error("Ошибка при установке роли:", error);
    throw new functions.https.HttpsError("internal", "Не удалось изменить роль.");
  }
});