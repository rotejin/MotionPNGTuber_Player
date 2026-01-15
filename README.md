# MotionPNGTuber Player

更新日: 2026-01-15

更新情報:
- **LipsyncEngineのリファクタリング** - DOM分離・Audio分離により他アプリへの組み込みが容易に
- **AudioCaptureクラス追加** - マイク入力処理を独立したクラスに分離
- **HTTPパスでのアセット読み込み対応** - サーバーからアセットを直接読み込み可能
- **外部音声入力対応** - TTS等マイク以外の音声ソースにも対応

> **[MotionPNGTuber](https://github.com/rotejin/MotionPNGTuber)** のブラウザ版再生専用パッケージ

ブラウザで動作する軽量なPNGTuberリップシンクプレイヤーです。
Python環境不要で、マイク入力に応じてキャラクターの口がリアルタイムで動きます。

- **本体**: 動画解析・キャリブレーション・口消し動画生成などの**アセット作成**
- **このパッケージ**: 作成済みアセットを使った**ブラウザ再生のみ**

アセットの作成方法は [本体リポジトリ](https://github.com/rotejin/MotionPNGTuber) を参照してください。

## 特徴

- **ブラウザのみで動作** - Python環境不要
- **リアルタイムリップシンク** - マイク音声に合わせて口が動く
- **5種類の口パターン** - closed / half / open / e / u
- **母音認識** - 高低周波数比率から「え」「う」を自動判定
- **OBS対応** - ウィンドウキャプチャで配信に使用可能

---

## クイックスタート

### 1. ローカルサーバーを起動

```powershell
cd MotionPNGTuber_Player
python -m http.server 8000
```

### 2. ブラウザでアクセス

```
http://localhost:8000
```

### 3. 操作手順

1. **データフォルダを選択** - キャラクターのアセットフォルダを選ぶ
   - サンプル: `assets/assets14` または `assets/assets23`
2. **マイクを開始** - マイクへのアクセスを許可
3. **感度を調整** - スライダーで反応感度を調整
4. **開始** - リップシンク再生がスタート

---

## アセット構成

キャラクターフォルダは以下の構成が必要です（[本体リポジトリ](https://github.com/rotejin/MotionPNGTuber)のGUIで一括生成可能）：

```
character_folder/
├── *_mouthless_h264.mp4   # 口なし動画（必須）
├── mouth_track.json       # トラッキングデータ（必須）
└── mouth/
    ├── closed.png         # 口を閉じた状態（必須）
    ├── open.png           # 口を開けた状態（必須）
    ├── half.png           # 半開き（任意）
    ├── e.png              # 「え」の口（任意）
    └── u.png              # 「う」の口（任意）
```

### 動画ファイルの要件

| 項目 | 要件 |
|------|------|
| コーデック | H.264（必須） |
| フレームレート | CFR（固定フレームレート）必須 |
| ファイル名 | `*_mouthless_h264.mp4` を含む |

> **重要**: VFR（可変フレームレート）だとトラッキングと同期がズレます

### 口スプライト画像

- **形式**: PNG（透過推奨）
- **サイズ**: トラッキングデータの `refSpriteSize` に合わせる（例: 128x85px）
- **内容**: 口部分のみを透過背景で作成

---

## リップシンクの仕組み

```
マイク入力
    ↓
AudioWorklet で音声解析
    ↓
┌─────────────────────────────────────┐
│  RMS（音量）と高低周波数比を計算      │
│  ・音量小 → closed                   │
│  ・音量中 → half                     │
│  ・音量大 + 高周波多め → e            │
│  ・音量大 + 低周波多め → u            │
│  ・音量大 + それ以外 → open           │
└─────────────────────────────────────┘
    ↓
対応する口スプライトを四角形に変形描画
```

---

## OBSでの使用方法

1. 通常のブラウザ（Chrome/Edge）でプレイヤーを開く
2. OBSで「ウィンドウキャプチャ」を追加
3. ブラウザウィンドウを選択
4. 必要に応じてクロマキーやフィルタを設定

---

## トラブルシューティング

### マイクが使えない

- `file://` ではなく `http://localhost` でアクセスしていますか？
- ブラウザのマイク許可を確認してください

### 口の位置がズレる

- 動画がCFR（固定フレームレート）か確認
- `mouth_track.json` の `fps` と動画のfpsが一致しているか確認
- `calibration` パラメータで微調整

### 動画が再生されない

- H.264コーデックでエンコードされているか確認
- ファイル名に `mouthless` と `h264` が含まれているか確認

### 反応が鈍い / 過敏

- 感度スライダーで調整（0〜100）
- 値を上げると少ない音量でも反応

---

## 推奨環境

- **ブラウザ**: Google Chrome / Microsoft Edge（最新版）
- **OS**: Windows 10/11, macOS, Linux
- **必要機能**: AudioWorklet対応ブラウザ

---

## 技術仕様

| コンポーネント | 技術 |
|---------------|------|
| 音声処理 | Web Audio API + AudioWorklet |
| 周波数分離 | 1次ローパスフィルタ（700Hz） |
| フレーム同期 | requestVideoFrameCallback / requestAnimationFrame |
| 画像変形 | Canvas 2D アフィン変換（三角形ワーピング） |
| UI | HTML5 + CSS3 + Vanilla JavaScript |

---

## ファイル構成

```
MotionPNGTuber_Player/
├── index.html          # メインHTML
├── lipsync.js          # リップシンクエンジン（LipsyncEngineクラス）
├── audio-capture.js    # マイク入力処理（AudioCaptureクラス）
├── audio-worklet.js    # 音声解析ワークレット
├── style.css           # スタイルシート
├── README.md           # このファイル
└── assets/             # サンプルアセット
```

---

## 開発者向け: API リファレンス

LipsyncEngineは他のWebアプリケーションに組み込んで使用できます。

### 基本的な使い方（フォルダ選択）

```javascript
// DOM要素を準備
const video = document.getElementById('base-video');
const mouthCanvas = document.getElementById('mouth-canvas');
const stage = document.getElementById('stage');

// LipsyncEngine初期化
const engine = new LipsyncEngine({
    elements: { video, mouthCanvas, stage },
    callbacks: {
        onLog: (msg) => console.log(msg),
        onFileStatus: (status, message) => { /* 'success' or 'error' */ },
        onVolumeChange: (volume) => { /* 0-1 */ },
        onPlayStateChange: (isPlaying) => { /* true/false */ },
        onSectionsVisibility: (visible) => { /* true/false */ },
        onError: (message) => alert(message)
    }
});

// ファイル読み込み（フォルダ選択から）
engine.loadFiles(Array.from(inputElement.files));

// AudioCapture初期化（マイク入力）
const audioCapture = new AudioCapture({
    onVolumeData: (data) => engine.processAudioData(data),
    onStateChange: (isRunning) => { /* true/false */ },
    onDevicesLoaded: (devices) => { /* デバイス一覧 */ },
    onError: (message) => alert(message)
});

audioCapture.loadDevices();
audioCapture.start(deviceId);  // マイク開始
engine.start();                // 再生開始
```

### HTTPパスでアセット指定（自動読み込み・自動開始）

```javascript
const engine = new LipsyncEngine({
    elements: { video, mouthCanvas, stage },
    assets: {
        video: './assets/character/mouthless_h264.mp4',
        track: './assets/character/mouth_track.json',
        mouth_closed: './assets/character/mouth/closed.png',
        mouth_open: './assets/character/mouth/open.png',
        mouth_half: './assets/character/mouth/half.png',  // 任意
        mouth_e: './assets/character/mouth/e.png',        // 任意
        mouth_u: './assets/character/mouth/u.png'         // 任意
    },
    options: {
        debug: true,           // デバッグログ出力
        hqAudioEnabled: true,  // 高品質音声モード
        sensitivity: 50        // 感度（0-100）
    }
});
```

### 外部音声データ入力（TTS連携等）

```javascript
// マイクを使わず、外部から音声データを入力
engine.processAudioData({
    rms: 0.15,   // 音量（RMS値）
    high: 0.08,  // 高周波成分
    low: 0.12    // 低周波成分
});
```

### API一覧

| メソッド | 説明 |
|---------|------|
| `loadFiles(files)` | File配列からアセットを読み込み |
| `start()` | 再生開始 |
| `stop()` | 再生停止 |
| `processAudioData(data)` | 外部から音声データを入力 |
| `setSensitivity(value)` | 感度設定（0-100） |
| `setHQAudioEnabled(enabled)` | HQ Audioモード切替 |
| `resetAudioStats()` | 音声統計値をリセット |
| `cleanup()` | リソース解放 |

### AudioCapture API

| メソッド | 説明 |
|---------|------|
| `loadDevices()` | マイクデバイス一覧を取得 |
| `start(deviceId)` | マイク入力開始 |
| `stop()` | マイク入力停止 |
| `setHQAudioEnabled(enabled)` | HQ Audioモード切替 |
| `isRunning()` | 動作中かどうか |

---

## ライセンス

[MIT License](LICENSE)

Copyright (c) 2026 rotejin
