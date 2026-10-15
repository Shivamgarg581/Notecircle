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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.notecircle.data.model.NoteDto
import app.notecircle.data.model.NoteReactionDto
import app.notecircle.ui.theme.AmberPrimary
import app.notecircle.ui.theme.NoteCircleTheme

private val Ink = Color(0xFF211D1A)
private val Muted = Color(0xFF827970)
private val Canvas = Color(0xFFFAF7F2)
private val SoftAmber = Color(0xFFFFE8C2)
private val Lilac = Color(0xFFEDE7FF)
private val Mint = Color(0xFFDDF5E8)

private data class DemoChat(val name: String, val handle: String, val message: String, val time: String, val emoji: String, val unread: Int = 0)
private data class DemoPerson(val name: String, val handle: String, val emoji: String, val status: String)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NoteCircleTheme(darkTheme = false) {
                NoteCircleApp()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NoteCircleApp() {
    var selectedTab by remember { mutableIntStateOf(0) }
    var showComposer by remember { mutableStateOf(false) }
    var noteText by remember { mutableStateOf("") }
    var noteEmoji by remember { mutableStateOf("✨") }
    var selectedCategory by remember { mutableStateOf("Life") }
    var closeFriendsOnly by remember { mutableStateOf(false) }
    var searchText by remember { mutableStateOf("") }
    val notes = remember { mutableStateListOf(
        NoteDto("demo-1", "u1", "aanya.mehta", "Aanya Mehta", null, "☕", "life", "Life lately", "Slow mornings, good coffee, and finally making time for myself.", "connections", reactions = listOf(NoteReactionDto("u2", "rohan", "❤️", "now")), createdAt = "Just now"),
        NoteDto("demo-2", "u2", "rohan.shah", "Rohan Shah", null, "🎧", "music", "Currently listening", "A playlist for the long way home. Any song recommendations?", "connections", createdAt = "12 min ago"),
        NoteDto("demo-3", "u3", "meera.k", "Meera Kapoor", null, "🌿", "wellbeing", "Taking it slow", "Reminder to drink water, step outside, and be a little kinder to yourself today.", "close_friends", createdAt = "34 min ago")
    ) }
    val people = listOf(
        DemoPerson("Aanya", "@aanya.mehta", "🌼", "At a café"),
        DemoPerson("Rohan", "@rohan.shah", "🎧", "Listening to music"),
        DemoPerson("Meera", "@meera.k", "🌿", "Taking it slow"),
        DemoPerson("Kabir", "@kabir.s", "🏏", "Out with friends"),
        DemoPerson("Isha", "@isha.art", "🎨", "Creating")
    )
    val chats = listOf(
        DemoChat("Aanya Mehta", "@aanya.mehta", "That café looks lovely ☕", "2m", "🌼", 2),
        DemoChat("Rohan Shah", "@rohan.shah", "Send me that playlist!", "18m", "🎧", 1),
        DemoChat("Close Friends", "3 members", "Meera: Sunday plans? 🌿", "1h", "🫶"),
        DemoChat("Isha Verma", "@isha.art", "Thank you!! 🎨", "Yesterday", "🎨")
    )

    Scaffold(
        containerColor = Canvas,
        topBar = {
            if (selectedTab != 4) {
                TopAppBar(
                    title = {
                        Column {
                            Text("NoteCircle", color = Ink, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, letterSpacing = (-0.6).sp)
                            Text(
                                when (selectedTab) {
                                    0 -> "YOUR PEOPLE, YOUR MOMENT"
                                    1 -> "FIND YOUR KIND OF PEOPLE"
                                    2 -> "PRIVATE CONVERSATIONS"
                                    else -> "LITTLE MOMENTS, KEPT"
                                },
                                color = Muted, fontSize = 9.sp, letterSpacing = 1.5.sp, fontWeight = FontWeight.Bold
                            )
                        }
                    },
                    actions = {
                        Surface(
                            color = Color.White,
                            shape = CircleShape,
                            modifier = Modifier.padding(end = 14.dp).size(40.dp).clickable { selectedTab = 4 }
                        ) {
                            Box(contentAlignment = Alignment.Center) { Text("🧑🏻", fontSize = 22.sp) }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas)
                )
            }
        },
        bottomBar = {
            NavigationBar(containerColor = Color.White, tonalElevation = 4.dp) {
                val tabs = listOf("Circle", "Discover", "Chats", "History", "Profile")
                val icons = listOf("⌂", "⌕", "✉", "◷", "●")
                tabs.forEachIndexed { index, label ->
                    NavigationBarItem(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        icon = {
                            Box(contentAlignment = Alignment.Center) {
                                Text(icons[index], fontSize = 21.sp, fontWeight = FontWeight.Bold)
                                if (index == 2) Box(Modifier.align(Alignment.TopEnd).padding(top = 1.dp, end = 1.dp).size(7.dp).clip(CircleShape).background(AmberPrimary))
                            }
                        },
                        label = { Text(label, fontSize = 10.sp, fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Medium) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = AmberPrimary,
                            selectedTextColor = AmberPrimary,
                            indicatorColor = SoftAmber,
                            unselectedIconColor = Muted,
                            unselectedTextColor = Muted
                        )
                    )
                }
            }
        },
        floatingActionButton = {
            if (selectedTab == 0 || selectedTab == 3) {
                ExtendedFloatingActionButton(
                    onClick = { showComposer = true },
                    containerColor = Ink,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(18.dp),
                    icon = { Text("+", fontSize = 23.sp, fontWeight = FontWeight.Normal) },
                    text = { Text("New note", fontWeight = FontWeight.Bold) }
                )
            }
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (selectedTab) {
                0 -> CircleScreen(notes, people, onCompose = { showComposer = true }, onDiscover = { selectedTab = 1 })
                1 -> DiscoverScreen(people, searchText, { searchText = it })
                2 -> ChatsScreen(chats)
                3 -> HistoryScreen(notes)
                else -> ProfileScreen(notes.size)
            }
        }
    }

    if (showComposer) {
        AlertDialog(
            onDismissRequest = { showComposer = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(28.dp),
            title = {
                Column {
                    Text("Share a little moment", fontWeight = FontWeight.ExtraBold, color = Ink)
                    Text("Your circle is listening.", color = Muted, fontSize = 12.sp)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("✨", "☕", "🎧", "🌿", "😊", "🔥").forEach { emoji ->
                            Surface(
                                color = if (noteEmoji == emoji) SoftAmber else Canvas,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.size(38.dp).clickable { noteEmoji = emoji }
                            ) { Box(contentAlignment = Alignment.Center) { Text(emoji, fontSize = 19.sp) } }
                        }
                    }
                    OutlinedTextField(
                        value = noteText,
                        onValueChange = { if (it.length <= 180) noteText = it },
                        placeholder = { Text("What’s on your mind?") },
                        supportingText = { Text("${noteText.length}/180") },
                        minLines = 3,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text("CATEGORY", fontSize = 10.sp, color = Muted, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("Life", "Music", "Mood", "Plans").forEach { category ->
                            FilterChip(
                                selected = selectedCategory == category,
                                onClick = { selectedCategory = category },
                                label = { Text(category, fontSize = 11.sp) }
                            )
                        }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Close friends only", color = Ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            Text("Share with your inner circle", color = Muted, fontSize = 11.sp)
                        }
                        Switch(checked = closeFriendsOnly, onCheckedChange = { closeFriendsOnly = it })
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (noteText.isNotBlank()) {
                            notes.add(0, NoteDto(
                                id = "local-${System.currentTimeMillis()}",
                                userId = "local-user",
                                authorUsername = "you",
                                authorDisplayName = "You",
                                emoji = noteEmoji,
                                category = selectedCategory.lowercase(),
                                categoryLabel = selectedCategory,
                                text = noteText.trim(),
                                audience = if (closeFriendsOnly) "close_friends" else "connections",
                                createdAt = "Just now"
                            ))
                            noteText = ""
                            noteEmoji = "✨"
                            closeFriendsOnly = false
                            showComposer = false
                        }
                    },
                    enabled = noteText.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = Ink),
                    shape = RoundedCornerShape(14.dp)
                ) { Text("Share note") }
            },
            dismissButton = { TextButton(onClick = { showComposer = false }) { Text("Cancel", color = Muted) } }
        )
    }
}

@Composable
private fun CircleScreen(notes: List<NoteDto>, people: List<DemoPerson>, onCompose: () -> Unit, onDiscover: () -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 8.dp, bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Your circle", fontSize = 27.sp, fontWeight = FontWeight.ExtraBold, color = Ink, letterSpacing = (-0.7).sp)
                    Text("Little updates from people who matter.", color = Muted, fontSize = 12.sp)
                }
                Surface(color = Mint, shape = RoundedCornerShape(14.dp)) {
                    Text("●  All good", color = Color(0xFF27734A), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp))
                }
            }
        }
        item {
            Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = Ink), modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("A little check-in", color = Color(0xFFFFD9A0), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                        Spacer(Modifier.height(6.dp))
                        Text("How’s your day
really going?", color = Color.White, fontSize = 22.sp, lineHeight = 27.sp, fontWeight = FontWeight.ExtraBold)
                        Spacer(Modifier.height(12.dp))
                        Button(onClick = onCompose, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFD9A0), contentColor = Ink), shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp)) {
                            Text("Post a note  ↗", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Text("☀️", fontSize = 58.sp, modifier = Modifier.padding(start = 4.dp))
                }
            }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Around your circle", color = Ink, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                TextButton(onClick = onDiscover) { Text("See all  →", color = AmberPrimary, fontSize = 12.sp) }
            }
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(13.dp), modifier = Modifier.fillMaxWidth()) {
                people.forEachIndexed { index, person ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f).clickable { }) {
                        Box {
                            Surface(
                                color = listOf(SoftAmber, Lilac, Mint, Color(0xFFFFE4E1), Color(0xFFDDEEFF))[index],
                                shape = CircleShape,
                                modifier = Modifier.size(48.dp)
                            ) { Box(contentAlignment = Alignment.Center) { Text(person.emoji, fontSize = 23.sp) } }
                            Box(Modifier.align(Alignment.BottomEnd).size(12.dp).clip(CircleShape).background(Color(0xFF55B982)).padding(2.dp).clip(CircleShape).background(Color.White))
                        }
                        Spacer(Modifier.height(6.dp))
                        Text(person.name, fontSize = 10.sp, color = Ink, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Fresh from your people", color = Ink, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                Surface(color = SoftAmber, shape = RoundedCornerShape(8.dp)) { Text("24H NOTES", color = Color(0xFF8B5200), fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)) }
            }
        }
        items(notes, key = { it.id }) { note -> NoteFeedCard(note) }
        item {
            Surface(color = Color.White, shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth().clickable(onClick = onDiscover)) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("🫶", fontSize = 24.sp)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Make your circle feel closer", fontWeight = FontWeight.Bold, color = Ink, fontSize = 13.sp)
                        Text("Find people and invite them in.", color = Muted, fontSize = 11.sp)
                    }
                    Text("→", color = AmberPrimary, fontSize = 20.sp)
                }
            }
        }
    }
}

@Composable
private fun NoteFeedCard(note: NoteDto) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(22.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = when (note.category.lowercase()) { "music" -> Lilac; "wellbeing" -> Mint; else -> SoftAmber },
                    shape = RoundedCornerShape(15.dp),
                    modifier = Modifier.size(44.dp)
                ) { Box(contentAlignment = Alignment.Center) { Text(note.emoji, fontSize = 22.sp) } }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(note.authorDisplayName, color = Ink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text("@${note.authorUsername}  ·  ${note.createdAt}", color = Muted, fontSize = 10.sp)
                }
                Text("•••", color = Muted, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(13.dp))
            Text(note.categoryLabel.uppercase(), color = AmberPrimary, fontSize = 9.sp, letterSpacing = 1.2.sp, fontWeight = FontWeight.ExtraBold)
            Spacer(Modifier.height(4.dp))
            Text(note.text, color = Ink, fontSize = 14.sp, lineHeight = 21.sp)
            Spacer(Modifier.height(14.dp))
            HorizontalDivider(color = Canvas)
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("♡  ${note.reactions.size + 3}", color = Muted, fontSize = 11.sp)
                Spacer(Modifier.width(18.dp))
                Text("◯  Reply", color = Muted, fontSize = 11.sp)
                Spacer(Modifier.weight(1f))
                Text(if (note.audience == "close_friends") "🫶 Close friends" else "🔒 Circle only", color = Muted, fontSize = 10.sp)
            }
        }
    }
}

@Composable
private fun DiscoverScreen(people: List<DemoPerson>, searchText: String, onSearchChange: (String) -> Unit) {
    val filtered = people.filter { it.name.contains(searchText, true) || it.handle.contains(searchText, true) }
    Column(Modifier.fillMaxSize().padding(horizontal = 18.dp)) {
        Spacer(Modifier.height(8.dp))
        Text("Find your people", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = Ink)
        Text("A smaller, kinder corner of the internet.", color = Muted, fontSize = 12.sp)
        Spacer(Modifier.height(16.dp))
        OutlinedTextField(value = searchText, onValueChange = onSearchChange, modifier = Modifier.fillMaxWidth(), placeholder = { Text("Search people or usernames") }, leadingIcon = { Text("⌕", fontSize = 22.sp) }, shape = RoundedCornerShape(16.dp), singleLine = true)
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("For you", "Nearby", "Suggested").forEachIndexed { i, s ->
                Surface(color = if (i == 0) Ink else Color.White, shape = RoundedCornerShape(20.dp)) {
                    Text(s, color = if (i == 0) Color.White else Muted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp))
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
            items(filtered) { person ->
                Surface(color = Color.White, shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(color = SoftAmber, shape = CircleShape, modifier = Modifier.size(48.dp)) { Box(contentAlignment = Alignment.Center) { Text(person.emoji, fontSize = 23.sp) } }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(person.name, color = Ink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text(person.handle, color = Muted, fontSize = 11.sp)
                            Text("●  ${person.status}", color = Color(0xFF3E8A60), fontSize = 10.sp)
                        }
                        Button(onClick = {}, colors = ButtonDefaults.buttonColors(containerColor = Ink), shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(horizontal = 13.dp, vertical = 3.dp)) { Text("Connect", fontSize = 11.sp) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatsScreen(chats: List<DemoChat>) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Text("Your conversations", color = Ink, fontSize = 25.sp, fontWeight = FontWeight.ExtraBold)
            Text("Private chats with your circle.", color = Muted, fontSize = 12.sp)
            Spacer(Modifier.height(8.dp))
            Surface(color = Mint, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("🔐", fontSize = 20.sp)
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text("Your space stays yours", color = Color(0xFF245B3D), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Text("Keep conversations respectful and private.", color = Color(0xFF397450), fontSize = 10.sp)
                    }
                }
            }
        }
        item { Text("MESSAGES", color = Muted, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.4.sp) }
        items(chats) { chat ->
            Surface(color = Color.White, shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth().clickable { }) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(color = Lilac, shape = CircleShape, modifier = Modifier.size(48.dp)) { Box(contentAlignment = Alignment.Center) { Text(chat.emoji, fontSize = 22.sp) } }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(chat.name, color = Ink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text(chat.message, color = Muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(chat.time, color = Muted, fontSize = 9.sp)
                        if (chat.unread > 0) Surface(color = AmberPrimary, shape = CircleShape) { Text("${chat.unread}", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryScreen(notes: List<NoteDto>) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("Your moments", color = Ink, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
            Text("A little history of what you shared.", color = Muted, fontSize = 12.sp)
            Spacer(Modifier.height(8.dp))
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCard("NOTES", notes.size.toString(), SoftAmber, Modifier.weight(1f))
                StatCard("REACTIONS", (notes.sumOf { it.reactions.size } + 3).toString(), Lilac, Modifier.weight(1f))
                StatCard("CIRCLE", "12", Mint, Modifier.weight(1f))
            }
        }
        item { Text("RECENTLY SHARED", color = Muted, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.4.sp) }
        items(notes, key = { "history-${it.id}" }) { note -> NoteFeedCard(note) }
        item {
            Surface(color = Color.White, shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp)) {
                    Text("✨  Your story, your pace", color = Ink, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(4.dp))
                    Text("Notes are temporary by design. Your history helps you revisit the moments you choose to keep.", color = Muted, fontSize = 11.sp, lineHeight = 17.sp)
                }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, tint: Color, modifier: Modifier = Modifier) {
    Surface(color = tint, shape = RoundedCornerShape(16.dp), modifier = modifier) {
        Column(Modifier.padding(12.dp)) {
            Text(value, color = Ink, fontWeight = FontWeight.ExtraBold, fontSize = 21.sp)
            Text(label, color = Ink.copy(alpha = 0.7f), fontSize = 8.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.7.sp)
        }
    }
}

@Composable
private fun ProfileScreen(noteCount: Int) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.height(12.dp))
        Surface(color = SoftAmber, shape = RoundedCornerShape(30.dp), modifier = Modifier.size(94.dp)) { Box(contentAlignment = Alignment.Center) { Text("🧑🏻", fontSize = 48.sp) } }
        Spacer(Modifier.height(12.dp))
        Text("Your profile", color = Ink, fontSize = 25.sp, fontWeight = FontWeight.ExtraBold)
        Text("@you · Your own little corner", color = Muted, fontSize = 12.sp)
        Spacer(Modifier.height(18.dp))
        Surface(color = Color.White, shape = RoundedCornerShape(22.dp), modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Your circle, your rules", color = Ink, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Manage your privacy and availability.", color = Muted, fontSize = 11.sp)
                }
                Text("🛡️", fontSize = 26.sp)
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatCard("NOTES SHARED", noteCount.toString(), SoftAmber, Modifier.weight(1f))
            StatCard("FRIENDS", "12", Lilac, Modifier.weight(1f))
            StatCard("STREAK", "4 days", Mint, Modifier.weight(1f))
        }
        Spacer(Modifier.height(16.dp))
        listOf(
            Triple("🟢", "Availability", "Let your circle know how you’re doing"),
            Triple("👥", "Manage your circle", "Close friends and connections"),
            Triple("🔔", "Notifications", "Choose what you hear about"),
            Triple("🎨", "Appearance", "Theme and personalization"),
            Triple("🔒", "Privacy & safety", "Control who can see your notes"),
            Triple("⚙️", "Settings", "Account and app preferences")
        ).forEach { item ->
            Surface(color = Color.White, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clickable { }) {
                Row(Modifier.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(item.first, fontSize = 22.sp)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(item.second, color = Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Text(item.third, color = Muted, fontSize = 10.sp)
                    }
                    Text("›", color = Muted, fontSize = 23.sp)
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        Text("NoteCircle  •  A little closer, a little safer.", color = Muted, fontSize = 10.sp)
        Spacer(Modifier.height(16.dp))
    }
}
