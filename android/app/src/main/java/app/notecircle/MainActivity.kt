package app.notecircle

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import app.notecircle.ui.theme.NoteCircleTheme

private val Paper = Color(0xFFFAF7EF)
private val Yellow = Color(0xFFFFC900)
private val Black = Color(0xFF111111)
private val Muted = Color(0xFF77766F)
private val Coral = Color(0xFFFF866F)
private val Blue = Color(0xFF7CC4F7)
private val Green = Color(0xFF70D4A0)

private data class CircleNote(
    val id: Int,
    val name: String,
    val handle: String,
    val initials: String,
    val color: Color,
    val message: String,
    val tag: String,
    val hours: Int,
    val reactions: Int = 2,
    val replies: Int = 1
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NoteCircleTheme(darkTheme = false) {
                NoteCircleHome()
            }
        }
    }
}

@Composable
private fun NoteCircleHome() {
    var darkMode by remember { mutableStateOf(false) }
    var available by remember { mutableStateOf(true) }
    var showComposer by remember { mutableStateOf(false) }
    var showNotice by remember { mutableStateOf(false) }
    var showArchive by remember { mutableStateOf(false) }
    var selectedFilter by remember { mutableStateOf("All") }
    var selectedNav by remember { mutableIntStateOf(0) }
    var newText by remember { mutableStateOf("") }
    var newTag by remember { mutableStateOf("LIFE") }
    var nextId by remember { mutableIntStateOf(10) }
    val notes = remember {
        mutableStateListOf(
            CircleNote(1, "Maya Chen", "@maya", "MC", Coral, "Tokyo layover is looking like a 3 hour wait. Send me podcast recs, circle! 🎧", "✈️ TRAVEL", 4, 2, 1),
            CircleNote(2, "Aisha Patel", "@aisha", "AP", Blue, "Who's around for a 4pm coffee run? First one to reply picks the place ☕", "☕ BREAK", 1, 4, 2),
            CircleNote(3, "Zoe Kim", "@zoe", "ZK", Green, "Tiny win today: finally finished the thing I've been putting off 🌱", "🌱 LIFE", 8, 5, 0),
            CircleNote(4, "You", "@you", "S", Yellow, "A little reminder to take a breath and be kind to yourself.", "💛 THOUGHT", 12, 1, 0),
            CircleNote(5, "Maya Chen", "@maya", "MC", Coral, "Sunday playlist exchange? Drop your current favourite below 🎶", "🎧 MUSIC", 2, 3, 1)
        )
    }
    val bg = if (darkMode) Color(0xFF171613) else Paper
    val fg = if (darkMode) Color(0xFFF8F5ED) else Black
    val card = if (darkMode) Color(0xFF25231F) else Color.White

    MaterialTheme(colorScheme = if (darkMode) darkColorScheme(primary = Yellow, background = bg, surface = card, onSurface = fg) else lightColorScheme(primary = Yellow, background = bg, surface = card, onSurface = fg)) {
        Scaffold(
            containerColor = bg,
            bottomBar = {
                Row(
                    Modifier.fillMaxWidth().background(card).padding(top = 10.dp, bottom = 12.dp, start = 8.dp, end = 8.dp),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val navs = listOf("⌂" to "Home", "☷" to "Notes", "▤" to "Chat", "♧" to "Circle", "♙" to "Profile")
                    navs.forEachIndexed { index, pair ->
                        Column(
                            modifier = Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).clickable { selectedNav = index; if (index == 1) selectedFilter = "Notes"; if (index == 2) selectedFilter = "Chat"; if (index == 3) selectedFilter = "All"; if (index == 4) showNotice = true }.padding(vertical = 3.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(pair.first, fontSize = 26.sp, color = if (selectedNav == index) Black else Muted, fontWeight = FontWeight.Bold)
                            if (selectedNav == index) Box(Modifier.padding(top = 2.dp).size(6.dp).clip(CircleShape).background(Yellow))
                        }
                    }
                }
            }
        ) { padding ->
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Column {
                            Text("NoteCircle", color = fg, fontSize = 27.sp, fontWeight = FontWeight.Black, letterSpacing = (-1.1).sp)
                            Text("P R I V A T E  N O T E B O O K", color = fg, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            RoundAction(if (darkMode) "☀" else "☾", fg, card) { darkMode = !darkMode }
                            RoundAction("♧", fg, card) { showNotice = true }
                        }
                    }
                }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Surface(color = Yellow, shape = RoundedCornerShape(20.dp), border = androidx.compose.foundation.BorderStroke(2.dp, Black)) {
                            Text("THU OCT 15", color = Black, fontSize = 11.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Good morning, Shivam", color = fg, fontSize = 25.sp, lineHeight = 29.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                            Surface(color = card, shape = RoundedCornerShape(14.dp), border = androidx.compose.foundation.BorderStroke(2.dp, Black), modifier = Modifier.clickable { available = !available }) {
                                Text(if (available) "✅ Available" else "⛔ Away", color = fg, fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 9.dp, vertical = 10.dp))
                            }
                        }
                    }
                }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("CIRCLE ONLINE", color = fg, fontWeight = FontWeight.Black, fontSize = 15.sp, letterSpacing = 1.2.sp)
                        Text("3 active", color = fg, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(22.dp)) {
                        OnlineAvatar("MC", "Maya", Coral)
                        OnlineAvatar("AP", "Aisha", Blue)
                        OnlineAvatar("ZK", "Zoe", Green)
                    }
                }
                item {
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(30.dp)).background(if (darkMode) Color(0xFF34312A) else Color(0xFFF2EEE5)).padding(4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        listOf("All", "Notes", "Chat", "Plans").forEach { label ->
                            Box(Modifier.weight(1f).clip(RoundedCornerShape(25.dp)).background(if (selectedFilter == label) Yellow else Color.Transparent).clickable { selectedFilter = label }.padding(vertical = 10.dp), contentAlignment = Alignment.Center) {
                                Text(when(label) { "Notes" -> "Notes (${notes.size})"; "Chat" -> "Chat (3)"; "Plans" -> "Plans (2)"; else -> "All" }, color = Black, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                            }
                        }
                    }
                }
                item {
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(26.dp)).background(Yellow).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(color = Color.White, shape = RoundedCornerShape(15.dp), border = androidx.compose.foundation.BorderStroke(2.dp, Black), modifier = Modifier.size(54.dp)) {
                            Box(contentAlignment = Alignment.Center) { Text("✍️", fontSize = 26.sp) }
                        }
                        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                            Text("Write a Note for Your Circle", color = Black, fontWeight = FontWeight.Black, fontSize = 13.sp)
                            Text("Auto-expires in 24 hours · Shared with approved people only", color = Black, fontSize = 10.sp, lineHeight = 13.sp)
                        }
                        Surface(color = Black, shape = RoundedCornerShape(15.dp), modifier = Modifier.size(52.dp).clickable { showComposer = true }) {
                            Box(contentAlignment = Alignment.Center) { Text("+", color = Yellow, fontSize = 30.sp, fontWeight = FontWeight.Normal) }
                        }
                    }
                }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text(if (selectedFilter == "Chat") "CIRCLE CHAT" else if (selectedFilter == "Plans") "UPCOMING PLANS" else "CIRCLE NOTES", color = fg, fontWeight = FontWeight.Black, fontSize = 15.sp, letterSpacing = 1.sp)
                        Text("ARCHIVE  ☷", color = fg, fontWeight = FontWeight.Bold, fontSize = 11.sp, modifier = Modifier.clickable { showArchive = true })
                    }
                }
                if (selectedFilter == "Chat" || selectedFilter == "Plans") {
                    item {
                        NoteCircleInfoCard(if (selectedFilter == "Chat") "Your circle chats" else "Your plans", if (selectedFilter == "Chat") "Aisha: Coffee at 4? ☕\nMaya: Send me your playlist 🎧\nZoe: Sunday walk? 🌱" else "☕ Coffee run · Today, 4:00 PM\n🌿 Sunday walk · Sunday, 10:00 AM", fg, card)
                    }
                } else {
                    items(notes.filter { selectedFilter == "All" || selectedFilter == "Notes" }) { note ->
                        NoteCard(note, card, fg, onReact = {
                            val idx = notes.indexOfFirst { it.id == note.id }
                            if (idx >= 0) notes[idx] = notes[idx].copy(reactions = notes[idx].reactions + 1)
                        }, onReply = { showNotice = true })
                    }
                }
            }
        }
    }

    if (showComposer) {
        AlertDialog(
            onDismissRequest = { showComposer = false },
            containerColor = Paper,
            title = { Text("Write a note ✍️", color = Black, fontWeight = FontWeight.Black) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(value = newText, onValueChange = { newText = it }, label = { Text("What's happening?") }, placeholder = { Text("Share a little moment…") }, minLines = 3, maxLines = 5)
                    Text("Choose a tag", fontWeight = FontWeight.Bold, color = Black)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("LIFE", "TRAVEL", "BREAK").forEach { tag ->
                            FilterChip(selected = newTag == tag, onClick = { newTag = tag }, label = { Text(tag) })
                        }
                    }
                    Text("Visible to your circle · expires in 24 hours", fontSize = 11.sp, color = Muted)
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (newText.isNotBlank()) {
                        notes.add(0, CircleNote(nextId++, "Shivam", "@you", "S", Yellow, newText.trim(), "✦ $newTag", 24, 0, 0))
                        selectedFilter = "All"
                        newText = ""
                        showComposer = false
                    }
                }, colors = ButtonDefaults.buttonColors(containerColor = Yellow, contentColor = Black)) { Text("Post note", fontWeight = FontWeight.Bold) }
            },
            dismissButton = { TextButton(onClick = { showComposer = false }) { Text("Cancel", color = Black) } }
        )
    }
    if (showNotice) {
        AlertDialog(onDismissRequest = { showNotice = false }, containerColor = Paper, title = { Text("NoteCircle", color = Black, fontWeight = FontWeight.Black) }, text = { Text("This is a local demo right now. Real accounts, syncing, and live chat need backend setup.", color = Black) }, confirmButton = { TextButton(onClick = { showNotice = false }) { Text("OK", color = Black) } })
    }
    if (showArchive) {
        AlertDialog(onDismissRequest = { showArchive = false }, containerColor = Paper, title = { Text("Circle archive", color = Black, fontWeight = FontWeight.Black) }, text = { Text("Your current notes are shown in the feed. Expired-note storage will be available after the backend is connected.", color = Black) }, confirmButton = { TextButton(onClick = { showArchive = false }) { Text("Close", color = Black) } })
    }
}

@Composable
private fun RoundAction(label: String, fg: Color, card: Color, onClick: () -> Unit) {
    Surface(color = card, shape = RoundedCornerShape(18.dp), border = androidx.compose.foundation.BorderStroke(2.dp, Black), modifier = Modifier.size(48.dp).clickable { onClick() }) {
        Box(contentAlignment = Alignment.Center) { Text(label, fontSize = 23.sp, color = fg, fontWeight = FontWeight.Bold) }
    }
}

@Composable
private fun OnlineAvatar(initials: String, name: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box {
            Surface(color = color, shape = CircleShape, border = androidx.compose.foundation.BorderStroke(2.dp, Black), modifier = Modifier.size(64.dp)) {
                Box(contentAlignment = Alignment.Center) { Text(initials, color = Black, fontSize = 21.sp, fontWeight = FontWeight.Black) }
            }
            Box(Modifier.align(Alignment.BottomEnd).padding(bottom = 1.dp, end = 1.dp).size(15.dp).clip(CircleShape).background(Color(0xFF37C96B)))
        }
        Text(name, color = Black, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, modifier = Modifier.padding(top = 5.dp))
    }
}

@Composable
private fun NoteCard(note: CircleNote, card: Color, fg: Color, onReact: () -> Unit, onReply: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(bottom = 2.dp).clip(RoundedCornerShape(28.dp)).background(Black).padding(end = 4.dp, bottom = 5.dp)) {
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(26.dp)).background(card).padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(color = note.color, shape = CircleShape, border = androidx.compose.foundation.BorderStroke(2.dp, Black), modifier = Modifier.size(48.dp)) {
                    Box(contentAlignment = Alignment.Center) { Text(note.initials, color = Black, fontWeight = FontWeight.Black, fontSize = 16.sp) }
                }
                Column(Modifier.weight(1f).padding(start = 9.dp)) {
                    Text(note.name, color = fg, fontWeight = FontWeight.Black, fontSize = 13.sp)
                    Text("${note.handle}  ·  ◷  ${note.hours}h remaining", color = fg, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Surface(color = Yellow, shape = RoundedCornerShape(9.dp), border = androidx.compose.foundation.BorderStroke(2.dp, Black)) {
                    Text(note.tag, color = Black, fontWeight = FontWeight.Black, fontSize = 9.sp, modifier = Modifier.padding(horizontal = 7.dp, vertical = 5.dp))
                }
            }
            Text(note.message, color = fg, fontSize = 16.sp, lineHeight = 23.sp, modifier = Modifier.padding(top = 16.dp, bottom = 14.dp))
            HorizontalDivider(color = if (fg == Black) Color(0xFFE4E1DA) else Color(0xFF494640), thickness = 1.dp)
            Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                Surface(color = Paper, shape = RoundedCornerShape(20.dp), modifier = Modifier.clickable { onReact() }) { Text("❤️ ${note.reactions}", color = Black, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 9.dp, vertical = 7.dp)) }
                Surface(color = Paper, shape = RoundedCornerShape(20.dp), modifier = Modifier.clickable { onReact() }) { Text("☕", color = Black, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 9.dp, vertical = 7.dp)) }
                Surface(color = Yellow, shape = RoundedCornerShape(10.dp), border = androidx.compose.foundation.BorderStroke(2.dp, Black), modifier = Modifier.clickable { onReact() }) { Text("✨", color = Black, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp)) }
                Spacer(Modifier.weight(1f))
                Surface(color = Paper, shape = RoundedCornerShape(12.dp), border = androidx.compose.foundation.BorderStroke(2.dp, Black), modifier = Modifier.clickable { onReply() }) {
                    Text("☷  ${note.replies} replies", color = Black, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 7.dp))
                }
            }
        }
    }
}

@Composable
private fun NoteCircleInfoCard(title: String, body: String, fg: Color, card: Color) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(card).padding(18.dp)) {
        Text(title, color = fg, fontWeight = FontWeight.Black, fontSize = 16.sp)
        Text(body, color = fg, fontSize = 13.sp, lineHeight = 21.sp, modifier = Modifier.padding(top = 10.dp))
    }
}
