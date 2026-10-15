# NoteCircle Android

Native Android app scaffold built with Kotlin, Jetpack Compose, Material 3, Retrofit, and OkHttp.

## Build an APK

The repository includes a GitHub Actions workflow at `.github/workflows/android-apk.yml`.

1. Open the [Actions page](https://github.com/Shivamgarg581/Notecircle/actions).
2. Select **Android APK**.
3. Run the workflow with **Run workflow**, or push a change to the Android project.
4. Open the completed run and download the `notecircle-debug-apk` artifact.
5. Extract the ZIP and install the APK on an Android device. Android may ask you to allow installation from your browser or file manager.

The workflow uses Java 17, Android SDK platform 35, and Gradle 8.9. The project currently does not include the Gradle wrapper, so the workflow installs Gradle on the runner.

## Current implementation status

The current Android code is an early scaffold, not yet a complete production client.

- The Circle/Feed screen currently starts with an empty in-memory list; its refresh callback is not connected to the repository.
- The floating action button is not connected to a note composer.
- Chat and Profile navigation destinations in `MainActivity.kt` are placeholders.
- API service and repository classes exist, but the UI does not yet complete the login/session flow or load the feed from the deployed backend.
- The chat UI displays `MessageDto.text` and contains an “End-to-End Encrypted” label, but the Android UI shown here does not implement encryption/decryption. Do not treat the label as proof that end-to-end encryption is active.

## Before production use

1. Connect login and secure session/token storage.
2. Configure the HTTPS backend base URL and wire the feed, posting, profile, and chat screens to the repository.
3. Implement and test client-side message encryption/decryption before presenting chat as end-to-end encrypted.
4. Add unit/instrumentation tests and verify the app against a test backend.
5. Configure release signing securely in GitHub Actions if a signed release APK is needed.

Never commit API keys, signing keys, passwords, or production secrets to the repository.
