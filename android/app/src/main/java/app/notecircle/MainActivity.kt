package app.notecircle

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import app.notecircle.data.NoteCircleApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

private val Paper = Color(0xFFFAF7EF)
private val Sun = Color(0xFFFFC900)
private val Ink = Color(0xFF171713)
private val Muted = Color(0xFF77766F)
private val CardWhite = Color.White
private val Soft = Color(0xFFF1EDE3)
private val Coral = Color(0xFFFF866F)
private val Blue = Color(0xFF7CC4F7)
private val Green = Color(0xFF70D4A0)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val api = NoteCircleApi(applicationContext)
        setContent { NoteCircleApp(api) }
    }
}

@Composable
private fun NoteCircleApp(api: NoteCircleApi) {
    var user by remember { mutableStateOf(JSONObject()) }
    var route by remember { mutableStateOf(if (api.token.isNotBlank()) "Home" else "Login") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var baseUrl by remember { mutableStateOf(api.baseUrl) }
    var identifier by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var notes = remember { mutableStateListOf<JSONObject>() }
    var myNotes = remember { mutableStateListOf<JSONObject>() }
    var connections = remember { mutableStateListOf<JSONObject>() }
    var conversations = remember { mutableStateListOf<JSONObject>() }
    var messages = remember { mutableStateListOf<JSONObject>() }
    var notifications = remember { mutableStateListOf<JSONObject>() }
    var selectedConversation by remember { mutableStateOf<JSONObject?>(null) }
    var searchText by remember { mutableStateOf("") }
    var searchResults = remember { mutableStateListOf<JSONObject>() }
    var composerOpen by remember { mutableStateOf(false) }
    var composerText by remember { mutableStateOf("") }
    var composerEmoji by remember { mutableStateOf("💛") }
    var composerAudience by remember { mutableStateOf("followers") }
    var composerDuration by remember { mutableStateOf("1_day") }
    var replyTarget by remember { mutableStateOf<JSONObject?>(null) }
    var replyText by remember { mutableStateOf("") }
    var messageText by remember { mutableStateOf("") }
    var profileName by remember { mutableStateOf("") }
    var profileBio by remember { mutableStateOf("") }
    var profileCity by remember { mutableStateOf("") }
    var availability by remember { mutableStateOf("available") }
    var darkMode by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    fun task(successMessage: String? = null, block: suspend () -> Unit) {
        scope.launch {
            loading = true
            error = ""
            try {
                block()
                if (successMessage != null) notice = successMessage
            } catch (e: Exception) {
                error = e.message ?: "Something went wrong. Please try again."
            } finally {
                loading = false
            }
        }
    }

    fun loadFeed() = task {
        val data = withContext(Dispatchers.IO) { api.feed() }
        notes.clear()
        for (i in 0 until data.length()) data.optJSONObject(i)?.let { notes.add(it) }
    }

    fun loadMine() = task {
        val data = withContext(Dispatchers.IO) { api.myNotes() }
        myNotes.clear()
        val active = data.optJSONArray("activeNotes") ?: JSONArray()
        val scheduled = data.optJSONArray("scheduledNotes") ?: JSONArray()
        val drafts = data.optJSONArray("draftNotes") ?: JSONArray()
        val past = data.optJSONArray("pastNotes") ?: JSONArray()
        listOf(active, scheduled, drafts, past).forEach { array ->
            for (i in 0 until array.length()) array.optJSONObject(i)?.let { myNotes.add(it) }
        }
    }

    fun loadConnections() = task {
        val data = withContext(Dispatchers.IO) { api.connections() }
        connections.clear()
        for (i in 0 until data.length()) data.optJSONObject(i)?.let { connections.add(it) }
    }

    fun loadConversations() = task {
        val data = withContext(Dispatchers.IO) { api.conversations() }
        conversations.clear()
        for (i in 0 until data.length()) data.optJSONObject(i)?.let { conversations.add(it) }
    }

    fun loadNotifications() = task {
        val data = withContext(Dispatchers.IO) { api.notifications() }
        notifications.clear()
        val array = data.optJSONArray("notifications") ?: JSONArray()
        for (i in 0 until array.length()) array.optJSONObject(i)?.let { notifications.add(it) }
    }

    fun openRoute(destination: String) {
        route = destination
        error = ""
        when (destination) {
            "Home" -> loadFeed()
            "Notes" -> loadMine()
            "Chat" -> loadConversations()
            "Circle" -> loadConnections()
            "Notifications" -> loadNotifications()
            "Profile" -> {
                profileName = user.optString("displayName")
                profileBio = user.optString("bio")
                profileCity = user.optString("city")
                availability = user.optJSONObject("availability")?.optString("code") ?: "available"
            }
        }
    }

    LaunchedEffect(Unit) {
        if (api.token.isNotBlank() && api.baseUrl.isNotBlank()) {
            try {
                user = withContext(Dispatchers.IO) { api.currentUser() }
                profileName = user.optString("displayName")
                profileBio = user.optString("bio")
                profileCity = user.optString("city")
                openRoute("Home")
            } catch (e: Exception) {
                error = e.message ?: "Session check failed"
                route = "Login"
            }
        } else if (api.baseUrl.isBlank()) {
            route = "Settings"
            notice = "First, add the HTTPS API address in Settings."
        }
    }

    MaterialTheme(
        colorScheme = if (darkMode) darkColorScheme(primary = Sun, background = Color(0xFF171613), surface = Color(0xFF25231F), onSurface = Paper)
        else lightColorScheme(primary = Sun, background = Paper, surface = CardWhite, onSurface = Ink)
    ) {
        Scaffold(
            containerColor = if (darkMode) Color(0xFF171613) else Paper,
            topBar = {
                Row(
                    Modifier.fillMaxWidth().background(if (darkMode) Color(0xFF25231F) else Paper)
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("NoteCircle", fontSize = 26.sp, fontWeight = FontWeight.Black, letterSpacing = (-1).sp)
                        Text("P R I V A T E  N O T E B O O K", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Muted)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        IconButton(onClick = { darkMode = !darkMode }) { Text(if (darkMode) "☀️" else "🌙", fontSize = 20.sp) }
                        if (api.token.isNotBlank()) {
                            IconButton(onClick = { openRoute("Notifications") }) { Text("🔔", fontSize = 20.sp) }
                        }
                    }
                }
            },
            bottomBar = {
                if (api.token.isNotBlank() && route != "Settings") {
                    Row(
                        Modifier.fillMaxWidth().background(if (darkMode) Color(0xFF25231F) else CardWhite)
                            .navigationBarsPadding().padding(horizontal = 5.dp, vertical = 7.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        listOf("Home" to "⌂", "Notes" to "▤", "Chat" to "☏", "Circle" to "♧", "Profile" to "♙").forEach { (label, icon) ->
                            Column(
                                Modifier.weight(1f).clip(RoundedCornerShape(14.dp))
                                    .clickable { openRoute(label) }.padding(vertical = 4.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(icon, fontSize = 23.sp, color = if (route == label) Ink else Muted)
                                Text(label, fontSize = 10.sp, color = if (route == label) Ink else Muted, fontWeight = if (route == label) FontWeight.Bold else FontWeight.Normal)
                                if (route == label) Box(Modifier.padding(top = 3.dp).size(5.dp).clip(CircleShape).background(Sun))
                            }
                        }
                    }
                }
            }
        ) { insets ->
            Column(Modifier.fillMaxSize().padding(insets)) {
                if (error.isNotBlank()) {
                    Surface(color = Color(0xFFFFE2DC), modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 5.dp), shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(error, color = Color(0xFF7B2015), modifier = Modifier.weight(1f), fontSize = 13.sp)
                            Text("✕", color = Color(0xFF7B2015), modifier = Modifier.clickable { error = "" }.padding(4.dp))
                        }
                    }
                }
                if (notice.isNotBlank()) {
                    Surface(color = Color(0xFFFFF0B3), modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 5.dp), shape = RoundedCornerShape(12.dp)) {
                        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(notice, color = Ink, modifier = Modifier.weight(1f), fontSize = 12.sp)
                            Text("✕", modifier = Modifier.clickable { notice = "" }.padding(4.dp))
                        }
                    }
                }
                if (loading) LinearProgressIndicator(Modifier.fillMaxWidth(), color = Sun)
                when (route) {
                    "Login" -> LoginScreen(
                        identifier, { identifier = it }, password, { password = it },
                        onLogin = {
                            if (baseUrl.isNotBlank()) api.baseUrl = baseUrl
                            task {
                                user = withContext(Dispatchers.IO) { api.login(identifier, password) }
                                profileName = user.optString("displayName")
                                openRoute("Home")
                            }
                        },
                        onSettings = { route = "Settings" }
                    )
                    "Settings" -> SettingsScreen(
                        baseUrl = baseUrl,
                        onBaseUrlChange = { baseUrl = it },
                        onSave = {
                            api.baseUrl = baseUrl
                            task("API address saved.") {
                                val health = withContext(Dispatchers.IO) { api.request("/api/health") }
                                notice = "Connected to " + health.optString("service", "NoteCircle API")
                            }
                        },
                        onBack = { route = if (api.token.isNotBlank()) "Home" else "Login" },
                        onLogout = {
                            task("Signed out.") {
                                withContext(Dispatchers.IO) { try { api.logout() } catch (_: Exception) { api.signOut() } }
                                user = JSONObject()
                                route = "Login"
                            }
                        },
                        signedIn = api.token.isNotBlank()
                    )
                    "Home" -> HomeScreen(
                        notes = notes,
                        onRefresh = { loadFeed() },
                        onCompose = { composerOpen = true },
                        onReact = { note -> task("Reaction updated.") {
                            val id = note.optString("id")
                            withContext(Dispatchers.IO) { api.react(id, "💛") }
                            val refreshed = withContext(Dispatchers.IO) { api.feed() }
                            notes.clear()
                            for (i in 0 until refreshed.length()) refreshed.optJSONObject(i)?.let { notes.add(it) }
                        } },
                        onReply = { replyTarget = it; replyText = "" }
                    )
                    "Notes" -> NotesScreen(myNotes, onRefresh = { loadMine() }, onCompose = { composerOpen = true }, onDelete = { note ->
                        task("Note deleted.") {
                            withContext(Dispatchers.IO) { api.request("/api/notes/${note.optString("id")}", "DELETE") }
                            loadMine()
                        }
                    })
                    "Chat" -> ChatScreen(
                        conversations, selectedConversation, messages, messageText,
                        onMessageText = { messageText = it },
                        onOpen = { conversation ->
                            selectedConversation = conversation
                            task {
                                val id = conversation.optString("id")
                                val data = withContext(Dispatchers.IO) { api.messages(id) }
                                messages.clear()
                                for (i in 0 until data.length()) data.optJSONObject(i)?.let { messages.add(it) }
                            }
                        },
                        onSend = {
                            val conversation = selectedConversation
                            if (conversation != null && messageText.isNotBlank()) {
                                val textToSend = messageText
                                messageText = ""
                                task("Message sent.") {
                                    withContext(Dispatchers.IO) { api.sendMessage(conversation.optString("id"), textToSend) }
                                    val data = withContext(Dispatchers.IO) { api.messages(conversation.optString("id")) }
                                    messages.clear()
                                    for (i in 0 until data.length()) data.optJSONObject(i)?.let { messages.add(it) }
                                }
                            } else if (conversation == null) error = "Choose a conversation first."
                        },
                        onRefresh = { loadConversations() }
                    )
                    "Circle" -> CircleScreen(
                        connections, searchText, { searchText = it }, searchResults,
                        onRefresh = { loadConnections() },
                        onSearch = {
                            task {
                                val data = withContext(Dispatchers.IO) { api.searchUsers(searchText) }
                                searchResults.clear()
                                for (i in 0 until data.length()) data.optJSONObject(i)?.let { searchResults.add(it) }
                            }
                        },
                        onFollow = { person ->
                            task("Connection request sent.") {
                                withContext(Dispatchers.IO) {
                                    api.request("/api/connections/request/${person.optString("id")}", "POST")
                                }
                            }
                        }
                    )
                    "Profile" -> ProfileScreen(
                        profileName, { profileName = it }, profileBio, { profileBio = it },
                        profileCity, { profileCity = it }, availability, { availability = it },
                        onSave = {
                            task("Profile saved.") {
                                val updated = withContext(Dispatchers.IO) { api.updateProfile(profileName, profileBio, profileCity) }
                                user = updated.optJSONObject("user") ?: user
                            }
                        },
                        onAvailability = {
                            task("Availability updated.") {
                                withContext(Dispatchers.IO) { api.updateAvailability(availability) }
                            }
                        },
                        onSettings = { route = "Settings" }
                    )
                    "Notifications" -> NotificationsScreen(notifications, onRefresh = { loadNotifications() }, onRead = { notification ->
                        task {
                            withContext(Dispatchers.IO) {
                                api.request("/api/notifications/${notification.optString("id")}/read", "POST")
                            }
                            loadNotifications()
                        }
                    })
                    else -> LoginScreen(identifier, { identifier = it }, password, { password = it }, {}, { route = "Settings" })
                }
            }
        }
    }

    if (composerOpen) {
        AlertDialog(
            onDismissRequest = { composerOpen = false },
            title = { Text("Write a note", fontWeight = FontWeight.Black) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(value = composerText, onValueChange = { composerText = it }, label = { Text("What would you like to share?") }, minLines = 3)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("💛", "🌱", "☕", "🎧", "✈️").forEach { emoji ->
                            Surface(color = if (composerEmoji == emoji) Sun else Soft, shape = CircleShape, modifier = Modifier.clickable { composerEmoji = emoji }) {
                                Text(emoji, modifier = Modifier.padding(8.dp), fontSize = 20.sp)
                            }
                        }
                    }
                    Text("Who can see it?", fontWeight = FontWeight.SemiBold)
                    listOf("followers", "close_friends", "private").forEach { audience ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { composerAudience = audience }) {
                            RadioButton(selected = composerAudience == audience, onClick = { composerAudience = audience })
                            Text(when (audience) { "followers" -> "Approved connections"; "close_friends" -> "Close friends"; else -> "Only me" })
                        }
                    }
                    Text("Expiry", fontWeight = FontWeight.SemiBold)
                    listOf("1_day" to "24 hours", "3_days" to "3 days", "never" to "Never").forEach { (value, label) ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { composerDuration = value }) {
                            RadioButton(selected = composerDuration == value, onClick = { composerDuration = value })
                            Text(label)
                        }
                    }
                }
            },
            confirmButton = {
                Button(enabled = composerText.isNotBlank() && !loading, onClick = {
                    val textToPost = composerText.trim()
                    composerOpen = false
                    task("Your note was published.") {
                        withContext(Dispatchers.IO) { api.createNote(textToPost, composerEmoji, "custom", composerAudience, composerDuration) }
                        val data = withContext(Dispatchers.IO) { api.feed() }
                        notes.clear()
                        for (i in 0 until data.length()) data.optJSONObject(i)?.let { notes.add(it) }
                        if (route == "Notes") loadMine()
                    }
                    composerText = ""
                }) { Text("Publish note") }
            },
            dismissButton = { TextButton(onClick = { composerOpen = false }) { Text("Cancel") } }
        )
    }

    replyTarget?.let { note ->
        AlertDialog(
            onDismissRequest = { replyTarget = null },
            title = { Text("Reply to note") },
            text = { OutlinedTextField(value = replyText, onValueChange = { replyText = it }, label = { Text("Your reply") }, minLines = 2) },
            confirmButton = {
                Button(enabled = replyText.isNotBlank(), onClick = {
                    val target = note
                    val textToSend = replyText.trim()
                    replyTarget = null
                    task("Reply sent.") {
                        withContext(Dispatchers.IO) { api.reply(target.optString("id"), textToSend) }
                        val data = withContext(Dispatchers.IO) { api.feed() }
                        notes.clear()
                        for (i in 0 until data.length()) data.optJSONObject(i)?.let { notes.add(it) }
                    }
                }) { Text("Send reply") }
            },
            dismissButton = { TextButton(onClick = { replyTarget = null }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun LoginScreen(
    identifier: String, onIdentifier: (String) -> Unit,
    password: String, onPassword: (String) -> Unit,
    onLogin: () -> Unit, onSettings: () -> Unit
) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 30.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text("Your circle,\nyour space.", fontSize = 38.sp, lineHeight = 42.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(10.dp))
        Text("A quieter place to share little moments with the people you trust.", color = Muted, fontSize = 15.sp)
        Spacer(Modifier.height(28.dp))
        Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = CardWhite)) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("Welcome back", fontSize = 23.sp, fontWeight = FontWeight.Black)
                OutlinedTextField(value = identifier, onValueChange = onIdentifier, label = { Text("Email or username") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(value = password, onValueChange = onPassword, label = { Text("Password") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Button(onClick = onLogin, enabled = identifier.isNotBlank() && password.isNotBlank(), modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Sun, contentColor = Ink)) {
                    Text("Sign in", fontWeight = FontWeight.Bold)
                }
                Text("Need to configure the server?", color = Muted, modifier = Modifier.align(Alignment.CenterHorizontally).clickable { onSettings() })
            }
        }
        Spacer(Modifier.height(18.dp))
        Text("Private by design · Native Android · No WebView", color = Muted, fontSize = 12.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
    }
}

@Composable
private fun SettingsScreen(
    baseUrl: String, onBaseUrlChange: (String) -> Unit, onSave: () -> Unit,
    onBack: () -> Unit, onLogout: () -> Unit, signedIn: Boolean
) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Settings", fontSize = 30.sp, fontWeight = FontWeight.Black)
        Text("Connect the native app to your NoteCircle API. Enter the backend's HTTPS origin, not a website page path.", color = Muted)
        OutlinedTextField(
            value = baseUrl, onValueChange = onBaseUrlChange,
            label = { Text("API base URL") }, placeholder = { Text("https://api.yourdomain.com") },
            modifier = Modifier.fillMaxWidth(), singleLine = true
        )
        Button(onClick = onSave, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Sun, contentColor = Ink)) {
            Text("Save and test connection", fontWeight = FontWeight.Bold)
        }
        Text("The server must expose /api/health, /api/auth, /api/notes, /api/chat and /api/connections. Do not paste API keys or passwords here.", fontSize = 12.sp, color = Muted)
        if (signedIn) {
            OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) { Text("Sign out") }
        }
        TextButton(onClick = onBack) { Text("Back") }
    }
}

@Composable
private fun HomeScreen(
    notes: SnapshotStateList<JSONObject>, onRefresh: () -> Unit, onCompose: () -> Unit,
    onReact: (JSONObject) -> Unit, onReply: (JSONObject) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Surface(color = Sun, shape = RoundedCornerShape(10.dp)) {
                Text("YOUR PRIVATE CIRCLE", modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), fontSize = 10.sp, fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.height(10.dp))
            Text("Good to see you ✨", fontSize = 27.sp, fontWeight = FontWeight.Black)
            Text("A little space for the people who matter.", color = Muted)
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = onCompose, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = Sun, contentColor = Ink)) { Text("＋ Write a note") }
                OutlinedButton(onClick = onRefresh, modifier = Modifier.weight(1f)) { Text("↻ Refresh") }
            }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text("CIRCLE NOTES", fontSize = 15.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                Text("${notes.size} notes", color = Muted, fontSize = 12.sp)
            }
        }
        if (notes.isEmpty()) item {
            EmptyCard("Your circle is quiet", "Pull to refresh or write the first note for your circle.")
        }
        items(notes, key = { it.optString("id") }) { note ->
            NoteCard(note, onReact = { onReact(note) }, onReply = { onReply(note) })
        }
    }
}

@Composable
private fun NotesScreen(
    notes: SnapshotStateList<JSONObject>, onRefresh: () -> Unit, onCompose: () -> Unit,
    onDelete: (JSONObject) -> Unit
) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("My notes", fontSize = 30.sp, fontWeight = FontWeight.Black)
            Text("Active, scheduled, drafts and past notes", color = Muted)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onCompose, colors = ButtonDefaults.buttonColors(containerColor = Sun, contentColor = Ink)) { Text("＋ New note") }
                OutlinedButton(onClick = onRefresh) { Text("Refresh") }
            }
        }
        if (notes.isEmpty()) item { EmptyCard("No saved notes yet", "Your notes will appear here after you publish them.") }
        items(notes, key = { it.optString("id") }) { note ->
            NoteCard(note, onReact = {}, onReply = {})
            if (note.optBoolean("isOwner", true)) {
                TextButton(onClick = { onDelete(note) }) { Text("Delete note", color = Color(0xFFB3261E)) }
            }
        }
    }
}

@Composable
private fun NoteCard(note: JSONObject, onReact: () -> Unit, onReply: () -> Unit) {
    val author = note.optJSONObject("author") ?: JSONObject()
    val name = author.optString("displayName").ifBlank { author.optString("username").ifBlank { "Circle member" } }
    val text = note.optString("text").ifBlank { note.optString("message") }
    val emoji = note.optString("emoji").ifBlank { "💛" }
    val category = note.optString("categoryLabel").ifBlank { note.optString("category").ifBlank { "PERSONAL NOTE" } }
    val reactionCount = note.optJSONArray("reactions")?.length() ?: note.optInt("reactionCount", 0)
    val replyCount = note.optJSONArray("replies")?.length() ?: note.optInt("replyCount", 0)
    Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = CardWhite), elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(color = listOf(Coral, Blue, Green, Sun)[(name.hashCode().ushr(1) % 4)], shape = CircleShape, modifier = Modifier.size(42.dp)) {
                    Box(contentAlignment = Alignment.Center) { Text(name.take(1).uppercase(), fontWeight = FontWeight.Black) }
                }
                Column(Modifier.weight(1f).padding(start = 10.dp)) {
                    Text(name, fontWeight = FontWeight.Bold)
                    Text("@${author.optString("username").ifBlank { name.lowercase().replace(" ", "") }}", fontSize = 11.sp, color = Muted)
                }
                Surface(color = Soft, shape = RoundedCornerShape(8.dp)) {
                    Text(category.uppercase(), modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp), fontSize = 9.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                }
            }
            Text(text.ifBlank { "No note text was returned by the server." }, fontSize = 15.sp, lineHeight = 22.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onReact) { Text("💛 $reactionCount") }
                TextButton(onClick = onReply) { Text("💬 $replyCount replies") }
                Spacer(Modifier.weight(1f))
                Text(emoji, fontSize = 18.sp)
            }
        }
    }
}

@Composable
private fun ChatScreen(
    conversations: SnapshotStateList<JSONObject>, selected: JSONObject?, messages: SnapshotStateList<JSONObject>,
    messageText: String, onMessageText: (String) -> Unit, onOpen: (JSONObject) -> Unit,
    onSend: () -> Unit, onRefresh: () -> Unit
) {
    if (selected == null) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Text("Circle chat", fontSize = 30.sp, fontWeight = FontWeight.Black)
                Text("Private conversations with your connections", color = Muted)
                OutlinedButton(onClick = onRefresh) { Text("Refresh conversations") }
            }
            if (conversations.isEmpty()) item { EmptyCard("No conversations yet", "Connect with people in your circle to start chatting.") }
            items(conversations, key = { it.optString("id") }) { conversation ->
                val title = conversation.optString("title").ifBlank {
                    conversation.optJSONArray("participants")?.optJSONObject(0)?.optString("displayName") ?: "Conversation"
                }
                Card(Modifier.fillMaxWidth().clickable { onOpen(conversation) }, shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = CardWhite)) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(color = Sun, shape = CircleShape, modifier = Modifier.size(44.dp)) { Box(contentAlignment = Alignment.Center) { Text("💬") } }
                        Column(Modifier.weight(1f).padding(start = 12.dp)) {
                            Text(title, fontWeight = FontWeight.Bold)
                            Text(conversation.optJSONObject("lastMessage")?.optString("text") ?: "Tap to open conversation", color = Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        Text("›", fontSize = 24.sp)
                    }
                }
            }
        }
    } else {
        Column(Modifier.fillMaxSize().padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("‹", fontSize = 28.sp, modifier = Modifier.clickable { onOpen(JSONObject()) }.padding(end = 10.dp))
                Column {
                    Text(selected.optString("title").ifBlank { "Conversation" }, fontSize = 22.sp, fontWeight = FontWeight.Black)
                    Text("Messages are sent through your NoteCircle server", color = Muted, fontSize = 11.sp)
                }
            }
            LazyColumn(Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (messages.isEmpty()) item { EmptyCard("No messages loaded", "Send the first message below.") }
                items(messages, key = { it.optString("id") }) { message ->
                    val isMine = message.optString("senderId") == "me"
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start) {
                        Surface(color = if (isMine) Sun else CardWhite, shape = RoundedCornerShape(16.dp), modifier = Modifier.widthIn(max = 300.dp)) {
                            Column(Modifier.padding(12.dp)) {
                                if (!isMine) Text(message.optString("senderName").ifBlank { message.optString("username") }, fontSize = 10.sp, color = Muted)
                                Text(message.optString("text").ifBlank { "[Encrypted message payload]" })
                            }
                        }
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = messageText, onValueChange = onMessageText, modifier = Modifier.weight(1f), placeholder = { Text("Write a message") }, maxLines = 4)
                Button(onClick = onSend, enabled = messageText.isNotBlank(), colors = ButtonDefaults.buttonColors(containerColor = Sun, contentColor = Ink)) { Text("Send") }
            }
        }
    }
}

@Composable
private fun CircleScreen(
    connections: SnapshotStateList<JSONObject>, searchText: String, onSearchText: (String) -> Unit,
    results: SnapshotStateList<JSONObject>, onRefresh: () -> Unit, onSearch: () -> Unit,
    onFollow: (JSONObject) -> Unit
) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Your circle", fontSize = 30.sp, fontWeight = FontWeight.Black)
            Text("People you have connected with", color = Muted)
            OutlinedButton(onClick = onRefresh) { Text("Refresh connections") }
            Spacer(Modifier.height(8.dp))
            Text("Find people", fontWeight = FontWeight.Bold)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = searchText, onValueChange = onSearchText, modifier = Modifier.weight(1f), placeholder = { Text("Username or name") }, singleLine = true)
                Button(onClick = onSearch, enabled = searchText.isNotBlank(), colors = ButtonDefaults.buttonColors(containerColor = Sun, contentColor = Ink)) { Text("Search") }
            }
        }
        if (results.isNotEmpty()) item { Text("SEARCH RESULTS", fontWeight = FontWeight.Black, letterSpacing = 1.sp) }
        items(results, key = { "search_" + it.optString("id") }) { person ->
            PersonCard(person, "Send request", onClick = { onFollow(person) })
        }
        item { Text("CONNECTED", fontWeight = FontWeight.Black, letterSpacing = 1.sp) }
        if (connections.isEmpty()) item { EmptyCard("Your circle is waiting", "Search for a username above to find people.") }
        items(connections, key = { it.optString("id") }) { person -> PersonCard(person, "Connected") {} }
    }
}

@Composable
private fun PersonCard(person: JSONObject, action: String, onClick: () -> Unit) {
    val name = person.optString("displayName").ifBlank { person.optString("username").ifBlank { "Circle member" } }
    Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = CardWhite)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(color = Blue, shape = CircleShape, modifier = Modifier.size(42.dp)) { Box(contentAlignment = Alignment.Center) { Text(name.take(1).uppercase(), fontWeight = FontWeight.Black) } }
            Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                Text(name, fontWeight = FontWeight.Bold)
                Text("@${person.optString("username")}", color = Muted, fontSize = 12.sp)
            }
            if (onClick != {}) {
                OutlinedButton(onClick = onClick, contentPadding = PaddingValues(horizontal = 8.dp)) { Text(action, fontSize = 11.sp) }
            } else Text(action, fontSize = 11.sp, color = Muted)
        }
    }
}

@Composable
private fun ProfileScreen(
    name: String, onName: (String) -> Unit, bio: String, onBio: (String) -> Unit,
    city: String, onCity: (String) -> Unit, availability: String, onAvailability: (String) -> Unit,
    onSave: () -> Unit, onAvailabilitySave: () -> Unit, onSettings: () -> Unit
) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Your profile", fontSize = 30.sp, fontWeight = FontWeight.Black)
        Surface(color = Sun, shape = CircleShape, modifier = Modifier.size(74.dp)) { Box(contentAlignment = Alignment.Center) { Text(name.take(1).uppercase().ifBlank { "S" }, fontSize = 30.sp, fontWeight = FontWeight.Black) } }
        OutlinedTextField(value = name, onValueChange = onName, label = { Text("Display name") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = bio, onValueChange = onBio, label = { Text("Bio") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
        OutlinedTextField(value = city, onValueChange = onCity, label = { Text("City") }, modifier = Modifier.fillMaxWidth())
        Button(onClick = onSave, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Sun, contentColor = Ink)) { Text("Save profile") }
        Text("Availability", fontWeight = FontWeight.Bold)
        listOf("available" to "🟢 Available", "busy" to "🟠 Busy", "dnd" to "🔴 Do not disturb", "away" to "⚪ Away").forEach { (code, label) ->
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { onAvailability(code) }) {
                RadioButton(selected = availability == code, onClick = { onAvailability(code) })
                Text(label)
            }
        }
        OutlinedButton(onClick = onAvailabilitySave, modifier = Modifier.fillMaxWidth()) { Text("Update availability") }
        TextButton(onClick = onSettings) { Text("App & account settings") }
    }
}

@Composable
private fun NotificationsScreen(
    notifications: SnapshotStateList<JSONObject>, onRefresh: () -> Unit, onRead: (JSONObject) -> Unit
) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Text("Notifications", fontSize = 30.sp, fontWeight = FontWeight.Black)
            OutlinedButton(onClick = onRefresh) { Text("Refresh") }
        }
        if (notifications.isEmpty()) item { EmptyCard("All caught up", "New circle activity will show up here.") }
        items(notifications, key = { it.optString("id") }) { notification ->
            Card(Modifier.fillMaxWidth().clickable { onRead(notification) }, shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = CardWhite)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(notification.optString("text").ifBlank { notification.optString("title").ifBlank { "NoteCircle update" } })
                    Text(notification.optString("createdAt"), color = Muted, fontSize = 10.sp)
                    Text("Mark as read", color = Muted, fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
private fun EmptyCard(title: String, subtitle: String) {
    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = CardWhite), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("🌱", fontSize = 28.sp)
            Text(title, fontWeight = FontWeight.Bold)
            Text(subtitle, color = Muted, fontSize = 13.sp)
        }
    }
}
