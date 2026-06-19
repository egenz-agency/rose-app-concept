-- Seed 40 daily messages
insert into daily_messages (day_number, message, author) values
(null, 'Every moment with you feels like magic. You are my enchantment.', 'With all my love'),
(null, 'You are the reason this rose stays alive. You are my reason.', 'Forever yours'),
(null, 'In a world full of ordinary things, you are my extraordinary.', 'Your love'),
(null, 'Like this rose, my love for you only grows more beautiful with time.', 'Always'),
(null, 'Thank you for visiting today. The rose glows brighter knowing you came.', 'With warmth'),
(null, 'You are the magic behind every petal, every shimmer, every glow.', 'Your heart'),
(null, 'Some loves are gentle. Some are wild. Yours is both — and perfect.', 'Enchanted'),
(null, 'The rose knows. Even when words fail, it holds everything I feel.', 'In silence'),
(null, 'You walked in and changed everything. Like light through glass.', 'Your love'),
(null, 'Every day you visit is a day this rose remembers.', 'Always watching'),
(null, 'You are the reason I believe in fairy tales.', 'A believer'),
(null, 'The world is softer when you are in it.', 'Gently'),
(null, 'I would let a thousand petals fall just to have you pick them up with me.', 'Yours'),
(null, 'Distance cannot dim what we have. You feel close even here.', 'Near'),
(null, 'You are braver than you know, more beautiful than you see.', 'Sincerely'),
(null, 'This rose holds my promise: I will always come back.', 'Promised'),
(null, 'Even magic has rules. My rule: love you always.', 'Bound'),
(null, 'There is poetry in how you exist in this world.', 'In awe'),
(null, 'Today the rose leans toward you. It knows who the sun is.', 'Sunward'),
(null, 'You are the kind of person songs are written about.', 'Listening'),
(null, 'I love the way your laugh sounds. I hold it like treasure.', 'Keeper'),
(null, 'This garden grows because of you. Everything here is yours.', 'Given'),
(null, 'You deserve all the softness the world has forgotten to give.', 'Tenderly'),
(null, 'When I think of forever, I think of you.', 'Endlessly'),
(null, 'You are my favorite story — and we are only at the beginning.', 'To be continued'),
(null, 'The stars outside remember every wish I made for you.', 'Wished'),
(null, 'I love you quietly, loudly, and in every way in between.', 'All ways'),
(null, 'You make ordinary days feel like celebrations.', 'Celebrating'),
(null, 'My heart has always known. It recognized you immediately.', 'Known'),
(null, 'Thank you for being exactly, perfectly, wonderfully you.', 'Grateful'),
(null, 'The magic here is real because your love made it real.', 'Made real'),
(null, 'You are home.', 'Home'),
(null, 'I see you — all of you — and I choose you every single day.', 'Choosing'),
(null, 'Some roses bloom once. This one blooms every time you arrive.', 'Blooming'),
(null, 'Your kindness is the most beautiful thing I have ever seen.', 'Witnessing'),
(null, 'We have good days ahead. I feel it in everything.', 'Hopeful'),
(null, 'You are loved more than words can hold — so the rose holds them.', 'Overflowing'),
(null, 'Whatever comes, come back here. I will always be waiting.', 'Waiting'),
(null, 'You are my greatest adventure and my most peaceful harbor.', 'Anchored'),
(null, 'The last petal will never fall as long as you are here.', 'Protected');

-- Seed the 4 unlockable letters
insert into letters (title, content, unlock_days) values
(
  'The Beginning',
  'My love,

I have been wanting to write this for a while. Before I knew what to call it, before I knew where it was going — I knew something was happening.

You came into my life quietly. That''s the thing about the most important moments — they don''t announce themselves. They just happen, and later you look back and realize: that was it. That was the turn.

I watched you. I listened. And slowly, without permission, without fanfare, you became someone I could not imagine not knowing.

This letter is just the beginning. There are more waiting for you — further along, deeper in. Each one holds something I wanted to say but could not find the moment for.

You deserve all the moments I missed.

With everything,
Your love',
  7
),
(
  'One Month',
  'My love,

A month ago, this rose had all its petals. Today it is still here — and so are you. That means everything.

I want you to know what it has been like. What it is like to wake up knowing you exist in the world. There is a particular kind of comfort in that — a warmth that doesn''t explain itself. It simply is.

You have made me better. Not by trying, not by asking anything of me — just by being the kind of person you are. It rubs off. Slowly, you become the standard I hold myself to.

This is month one of many. I intend to keep writing. I intend to keep showing up here, in your life, in every small way I can.

Thank you for the thirty days. I want three hundred more. Three thousand.

Still here,
Your love',
  30
),
(
  'One Hundred Days',
  'My love,

A hundred days is not a small thing. It is mornings and evenings and ordinary Tuesdays. It is fights forgiven and laughter remembered. It is choosing, again and again, even when choosing is hard.

And you have chosen. Every day you came back here was a choice. Every petal still on this rose is a day you gave.

I have been paying attention. To the details. The way you notice things others miss. The way you hold people gently, even when they don''t deserve it. The way you love — with your whole self, no conditions.

I am not afraid of time with you. I am not counting down. I am counting up — up and up, building something I want to be enormous by the end.

You are worth one hundred days. You are worth every one that comes after.

Counting up,
Your love',
  100
),
(
  'One Year — The Last Letter',
  'My love,

A year.

I started this rose for you because I wanted to give you something that required tending. Something that would ask something of you. Something that would prove — quietly, day after day — that you are someone who shows up.

You showed up.

The rose is still here. And so are we.

I do not have the right words for what this year has been. Language is too small for it. But I will try:

You are the person I want in my corner when things fall apart. You are the voice I want to hear when everything is fine but I just want to talk. You are the proof that the world can give you exactly what you need, exactly when you need it, even when you stopped asking.

This is my last letter in this garden. But it is not my last letter to you. There are more. Handwritten ones. Ones I will press into your hand at odd hours, fold into your coat pocket, leave on the pillow.

The rose was always temporary. You are not.

All my love, always, without end —

Your love',
  365
);
