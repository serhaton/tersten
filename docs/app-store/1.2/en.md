# App Store metadata – English (U.S.) – version 1.2

Version 1.1 is live. These are the texts for the 1.2 update; the 1.1 texts are in `docs/app-store/1.1/en.md`.
Screenshots for 1.2 are in `store-screenshots/1.2`.

Copy each block into the matching field in App Store Connect.
Character counts were checked against Apple's limits.

## Name (max 30) – unchanged

```
Say It Backwards: Party Game
```

## Subtitle (max 30) – unchanged

```
Reverse Audio Voice Challenge
```

## What's New in This Version (max 4000)

```
Keep score, play solo, and start faster.

• Six-round games with a score: the app swaps the roles every round and names the winner
• New result screen: the original and the copy play one after the other, then tap Got it or Missed
• Play solo: say a word, copy it backwards and hear how close you got
• Slow listening: play the backwards word slowly when it is hard to catch
• New home screen: tap Play to start straight away; the word theme is now a choice underneath, with a new Mixed theme
• A short try-out on first launch teaches the game with your own voice; open it again from Settings › How to play
• Suggested words show straight away; tap the word to hide it
• Optional player names: tap the score row
• Leaving in the middle of a round asks first
```

## Promotional text (max 170)

```
Say a word, hear it backwards, copy it and flip it back. Play six rounds against a friend and keep score, or try it solo. In English and Turkish.
```

## Description (max 4000)

```
Backwards is the party game where your voice goes into reverse.

One player secretly records a word. The other hears it played backwards, copies the strange sound as closely as they can, and records it. Then the app flips the copy the right way round. Does it sound like the real word? Make a guess, reveal the answer and get ready to laugh.

HOW TO PLAY
1. Tap Play. Pick a word theme first if you like.
2. Player 1 records a word. Need an idea? Tap Suggest a word.
3. Player 2 listens to the word backwards, slowly if needed, and copies it.
4. The app reverses the copy. Listen, guess and reveal the answer.
5. Got it? Score a point. The roles swap every round, and after six rounds the app names the winner.

PLAY SOLO
Nobody around? Say a word, copy it backwards and hear your copy next to the original.

WORD THEMES
• Mixed – suggestions from every theme
• Footballers
• Christmas
• Celebrities
• Car Brands
• Animals
• Food
• Anything – say whatever you like, and type your secret word if you want it revealed at the end

Every theme has its own colourful wallpaper, its own sound effects and its own word suggestions, nearly 100 in English and more in Turkish.

FEATURES
• Two players, one iPhone or iPad: no accounts, no sign-up
• Six-round games with a score, and optional player names
• Solo play
• Slow listening for hard words
• Instant recording: tap Record and start talking
• A short try-out on first launch that teaches the game in a few taps
• English and Turkish, with word suggestions in the language you choose
• Themed sounds, from a referee's whistle to sleigh bells, which you can turn off in Settings
• Your voice stays on your device: recordings are reversed on the device, never uploaded, and deleted when the round ends

Perfect for game nights, family gatherings, road trips and parties.

Backwards is free to play and supported by ads.
```

## Keywords (max 100, comma-separated, no spaces) – unchanged

```
singing,backward,reversed,talk,speech,sound,recorder,funny,trend,rewind,flip,word,guess,song,mimic
```

Words already in the name or subtitle (say, it, backwards, party, game, reverse, audio, voice, challenge) are left out on purpose: Apple indexes those fields together with the keywords.

## Keywords – English (U.K.) localization (optional, max 100) – unchanged

```
singing,backward,reversed,sound,recorder,funny,trend,rewind,word,guess,song,charades,family,laugh
```

## Copyright

```
2026 Serhat Onal
```

## App Review information – Notes for version 1.2 (max 4000)

```
Version 1.2 updates Say It Backwards ("Backwards" on the Home Screen in English, "Tersten" in Turkish), a party game: one player records a word, the other hears it backwards and imitates it, and the app reverses the imitation so both can guess. As before: no account, no purchases, no user content shared, microphone as the only permission, Google AdMob with Google's consent form (UMP) as the only third-party services.

NEW IN THE APP
1. First launch opens a short try-out instead of the home screen: record your name, hear it backwards, copy it, hear both. "Skip" (top left) leaves it at any time. It can be opened again from Settings (gear button) › "How to play". The try-out has no ads.
2. New home screen: "Play" (two players), "Try it solo", and a row of word themes including a new "Mixed" theme. Picking a theme changes the wallpaper and the word suggestions only.
3. Two-player games now have a score. A game is six rounds; the players swap roles every round. After "Show the answer" the original and the copy play one after the other, and the players tap "Got it" or "Missed". After round six the app shows the winner.
4. Solo play: the same loop for one person, without a score.
5. "Slow" on the Listen screen plays the backwards word at reduced speed.
6. Optional player names (tap the score row). They are kept in memory only.
7. Leaving in the middle of a round shows a confirmation alert.
8. Rating prompt: the app requests Apple's standard in-app rating prompt (SKStoreReviewController, via expo-store-review) after the 2nd, 12th and 30th finished round. It is never tied to a reward and there is no custom prompt.
9. Full-screen ads are less frequent: after every third finished round (was every second), shown when the next round starts.

HOW TO TEST (one person can play both roles)
1. First launch: on the try-out, tap the red button ("Allow the microphone") and allow access. Tap it again, say a word, tap to stop. Tap "Listen", then "Record", imitate the sound, tap "Stop". Tap "Start playing".
2. Home screen: tap "Play".
3. Player 1: optionally tap "Suggest a word". Tap the red microphone button, say a word, tap again to stop.
4. Player 2: tap "Listen" (optionally "Slow"), then "Record", imitate, "Stop". The reversed imitation plays automatically.
5. Tap "Show the answer", then "Got it" or "Missed", then "Next round".
6. "Try it solo" on the home screen runs the one-player version.

MICROPHONE
Unchanged from 1.1 on the game screens: the orange microphone indicator is on while a Record button is on screen, before it is tapped, because the app starts the recorder and pauses it straight away so that tapping Record only resumes it. Nothing from before the tap is kept. New in 1.2: on the first-launch try-out the permission is requested by the first tap on the button, not when the screen opens, and the recorder is prepared only after permission is granted. If permission is denied, an "Open Settings" button appears. Recordings are processed only on the device, never uploaded, and deleted when the next round starts or the game screen closes. No background audio.

DATA
No change in what is collected. Two more values are stored on the device only: whether the try-out has been seen, and the number of finished rounds (used only to time the rating prompt). The privacy policy describes both.

DEVICES
Universal, iOS/iPadOS 16.4 or later. Played on iPhone 16 (device). Every screen was also checked, in English and Turkish, on iPhone 18 Pro Max, iPhone 18 Pro, iPhone 11 Pro Max and iPad Pro 13-inch (M5) simulators.

Privacy policy: https://serhaton.com/tersten/1.2/en/privacy.html
Support: https://serhaton.com/tersten/1.2/en/support.html
```

## App Privacy

No change for 1.2. The answers published with 1.1 (the seven data types collected by the Google Mobile Ads SDK, not used for tracking) still apply; the steps are in `docs/app-store/1.1/en.md`. The rating prompt and the two new on-device values add nothing to declare. Only the Privacy Policy URL changes: set it to https://serhaton.com/tersten/1.2/en/privacy.html (Turkish: https://serhaton.com/tersten/1.2/tr/privacy.html).

## Submission checklist for 1.2

- **Version:** create version 1.2 in App Store Connect and attach the new build (1.2.0).
- **Screenshots:** replace every set with the ones in `store-screenshots/1.2`: 6.9-inch, 6.5-inch and 6.3-inch iPhone and 13-inch iPad, each in English and Turkish.
- **Texts:** What's New, promotional text and description change in both languages. Name, subtitle and keywords stay as they are.
- **Category and age rating:** unchanged (*Games › Word*, not the Kids category, advertising "Yes").
- **Screen recording (optional but helpful):** record on a real iPhone with the microphone on. Delete and reinstall the app first so the try-out shows; then one full two-player round, the score screen and Settings.
- **URLs:** the `docs/1.2` pages must be pushed and live before you submit, because the app's own "Privacy policy" link opens the 1.2 page.
  - Privacy policy URL: https://serhaton.com/tersten/1.2/en/privacy.html (Turkish localization: https://serhaton.com/tersten/1.2/tr/privacy.html)
  - Support URL: https://serhaton.com/tersten/1.2/en/support.html (Turkish: https://serhaton.com/tersten/1.2/tr/support.html)
  - Marketing URL: https://serhaton.com/tersten/1.2/en/ (Turkish: https://serhaton.com/tersten/1.2/tr/)
- **Build check:** the store build must be made without `EXPO_PUBLIC_NO_ADS`.
