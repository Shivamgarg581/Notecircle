package app.notecircle.data

import android.content.Context
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/** Native REST client for the existing NoteCircle API. */
class NoteCircleApi(context: Context) {
    private val prefs = context.getSharedPreferences("notecircle_native", Context.MODE_PRIVATE)
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .writeTimeout(25, TimeUnit.SECONDS)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    var baseUrl: String
        get() = prefs.getString("api_base_url", "") ?: ""
        set(value) { prefs.edit().putString("api_base_url", value.trim().trimEnd('/')).apply() }

    var token: String
        get() = prefs.getString("session_token", "") ?: ""
        private set(value) { prefs.edit().putString("session_token", value).apply() }

    fun signOut() { token = "" }

    @Throws(IOException::class)
    fun request(path: String, method: String = "GET", body: JSONObject? = null): JSONObject {
        val origin = baseUrl.trim().trimEnd('/')
        if (origin.isBlank()) throw IOException("Set your NoteCircle API HTTPS URL in Settings first.")
        if (!origin.startsWith("https://") && !origin.startsWith("http://10.0.2.2")) {
            throw IOException("For security, use an HTTPS API URL.")
        }
        val builder = Request.Builder().url(origin + path).header("Accept", "application/json")
        if (token.isNotBlank()) builder.header("Authorization", "Bearer $token")
        val requestBody = body?.toString()?.toRequestBody(jsonType)
        when (method.uppercase()) {
            "POST" -> builder.post(requestBody ?: "{}".toRequestBody(jsonType))
            "PUT" -> builder.put(requestBody ?: "{}".toRequestBody(jsonType))
            "PATCH" -> builder.patch(requestBody ?: "{}".toRequestBody(jsonType))
            "DELETE" -> if (requestBody != null) builder.delete(requestBody) else builder.delete()
            else -> builder.get()
        }
        client.newCall(builder.build()).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            val parsed = try { JSONObject(raw) } catch (_: Exception) { JSONObject() }
            if (!response.isSuccessful) {
                throw IOException(parsed.optString("error").ifBlank {
                    "Request failed (${response.code}). Check the API URL and try again."
                })
            }
            return parsed
        }
    }

    fun login(identifier: String, password: String): JSONObject {
        val result = request("/api/auth/login", "POST", JSONObject()
            .put("identifier", identifier.trim())
            .put("password", password)
            .put("deviceName", "NoteCircle Android"))
        token = result.optString("token")
        if (token.isBlank()) throw IOException("The server did not return a session token.")
        return result.optJSONObject("user") ?: JSONObject()
    }

    fun currentUser() = request("/api/auth/me").optJSONObject("user") ?: JSONObject()
    fun logout() { try { request("/api/auth/logout", "POST") } finally { signOut() } }
    fun feed() = request("/api/notes/feed").optJSONArray("notes") ?: JSONArray()
    fun myNotes() = request("/api/notes/mine")
    fun createNote(text: String, emoji: String, category: String, audience: String, duration: String) =
        request("/api/notes", "POST", JSONObject().put("text", text).put("emoji", emoji)
            .put("category", category).put("audience", audience).put("duration", duration)
            .put("allowReplies", true).put("allowReactions", true))
    fun react(noteId: String, emoji: String) =
        request("/api/notes/${noteId}/reaction", "POST", JSONObject().put("emoji", emoji))
    fun reply(noteId: String, text: String) =
        request("/api/notes/${noteId}/reply", "POST", JSONObject().put("text", text))
    fun connections() = request("/api/connections/list").optJSONArray("connections") ?: JSONArray()
    fun searchUsers(query: String) =
        request("/api/users/search?q=" + java.net.URLEncoder.encode(query, "UTF-8")).optJSONArray("users") ?: JSONArray()
    fun conversations() = request("/api/chat/conversations").optJSONArray("conversations") ?: JSONArray()
    fun messages(conversationId: String) =
        request("/api/chat/conversations/${conversationId}/messages").optJSONArray("messages") ?: JSONArray()
    fun sendMessage(conversationId: String, text: String) =
        request("/api/chat/conversations/${conversationId}/messages", "POST", JSONObject().put("text", text))
    fun notifications() = request("/api/notifications")
    fun updateProfile(displayName: String, bio: String, city: String) =
        request("/api/users/me", "PUT", JSONObject().put("displayName", displayName).put("bio", bio).put("city", city))
    fun updateAvailability(code: String) =
        request("/api/users/me/availability", "PUT", JSONObject().put("code", code))
}
