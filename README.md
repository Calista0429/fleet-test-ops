# Fleet Test Operations Dashboard

A working full-stack portfolio demo for an automotive test coordinator: identify available vehicles, inspect test evidence, and record incident follow-up.

Built with **React + TypeScript, Express, and PostgreSQL**. All application code and interface copy use English. Expand the Japanese documentation below.

This is an independent project using fictional vehicles, drivers, and incidents. The scenario is a proposed business use case; it does not describe Bosch's internal systems.

![Fleet overview](docs/screenshots/overview.png)

[Issue management preview](docs/screenshots/issues.png) · [Mobile overview](docs/screenshots/overview-mobile.png) · [Mobile issue form](docs/screenshots/issue-form-mobile.png)

## Business workflow

**Find a critical open issue → inspect its vehicle and test run → resolve or reopen the issue → update vehicle readiness → reload to confirm persistence.**

| Screen           | Working capabilities                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Fleet overview   | Current readiness, selected-period distance, daily/vehicle charts with exact-value tables, vehicle search/status/sort/pagination |
| Vehicle details  | Date-filtered run history, driver snapshots, recorded distance, linked issue counts, saved operational-status changes            |
| Issue management | Vehicle/run selection, creation, URL filters, severity/status edits, resolution timestamps, reopening                            |

Follow the [five-minute demo walkthrough](docs/demo-walkthrough.md) for an interview presentation. The initial seed contains 8 vehicles, 60 test runs across 20 JST dates, and 24 issues, including a vehicle with no runs and a run with multiple issues. Saved edits can change the visible counts.

## Metric definitions

| Metric                    | Scope and calculation                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Vehicles / available now  | Whole fleet's current state; available means `vehicles.status = 'available'`                                     |
| Unresolved now            | All issues whose status is `open` or `in_progress`, regardless of date                                           |
| Completed distance / runs | Completed runs whose **start time** falls inside the selected JST dates; cancelled/in-progress runs are excluded |
| Daily distance            | Same completed runs grouped by their JST start date; dates with no runs show zero                                |
| Vehicle distance          | Same period calculation, including registered vehicles with zero distance                                        |

End dates are inclusive in the interface. SQL uses a half-open UTC interval ending at the next JST midnight. Timestamps display Japan Standard Time (UTC+09:00); distance is kilometers. Distances are aggregated before issue joins, so several issues do not multiply a run's mileage. A missing recorded distance displays an explanatory dash.

## Architecture

![Application architecture](docs/architecture.svg)

[Standalone HTML diagram](docs/architecture.html): download and open it in a browser. It includes the architecture-diagram skill's original copy/PNG/PDF toolbar; the static SVG works directly in GitHub. The toolbar's image/PDF export uses its pinned external libraries and requires network access. Browser rendering was checked; automated download capture was unavailable.

| Layer     | Implementation                                                                    |
| --------- | --------------------------------------------------------------------------------- |
| Web       | React, TypeScript, Vite, React Router, Recharts; locally bundled IBM Plex fonts   |
| API       | Node.js 24, Express 5, parameterized PostgreSQL queries                           |
| Contracts | Shared TypeScript interfaces and Zod input schemas                                |
| Database  | PostgreSQL 17, versioned SQL migration, idempotent seed                           |
| Tests     | Vitest, Testing Library, Supertest, real PostgreSQL fixtures, Playwright Chromium |
| Workflow  | Separate feature commits, Issue/PR templates, pinned GitHub Actions configuration |

Development uses a Vite `/api` proxy. Production uses one Express origin for built pages and API routes; direct vehicle URLs receive the SPA entry page, while unknown API routes stay JSON 404s. Database connection details remain on the server. Pending reads are cancelled and invalidated so older responses cannot replace newer filters.

## SQL model

![Vehicle, test-run, and issue relationships](docs/erd.svg)

- `vehicles`: unique license plate, vehicle identity, current operational status.
- `test_runs`: belongs to one vehicle; stores the driver name as a historical snapshot, start/end times, status, and distance.
- `issues`: belongs to one test run; stores incident type, description, severity, status, and resolution time.

The vehicle of an issue is derived through its run; `issues` does not duplicate `vehicle_id`. SQL enforces foreign keys, nonnegative distances, valid time ordering, completed-run completeness, allowed statuses, description length, and resolution-time consistency. A small `schema_migrations` table records applied versions.

Read the [database rationale](docs/database-model.md) and [migration](database/migrations/001_initial.sql).

## Run locally

Use **Node.js 24.x**, npm, and **PostgreSQL 17**. Check `node --version` before installing. Run commands from the repository root.

For a new checkout:

```sh
npm ci
cp .env.example .env
```

Installation compiles the shared contracts automatically. Choose a database setup:

- **Installed PostgreSQL:** follow the [native setup guide](docs/local-postgresql.md), or point `DATABASE_URL` to a dedicated existing local database. This route was tested with PostgreSQL 17.5 and Node 24.21.0, including a clean install and an empty database.
- **Docker alternative:** run `docker compose up -d --wait`. It starts PostgreSQL 17 on loopback port 5433 with the sample credentials in `.env.example`. The Docker configuration is provided; Docker startup was not exercised because the local daemon was stopped.

Use a free database port and update `DATABASE_URL` when needed. Then:

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

Open [the local demo](http://127.0.0.1:5173). The API listens on 127.0.0.1:3001. Development watches both applications and the shared contracts.

Migration tracks versions; seeding inserts missing deterministic sample rows and preserves existing edits. The seed's dates are anchored when rows are first created. For a deliberate fresh set of demo dates:

```sh
npm run db:reset-demo
```

**Reset replaces saved demo edits in `issues`, `test_runs`, and `vehicles`.** It requires a loopback database named `fleet_ops`, preserves migration history, and is separate from ordinary startup. An explicit confirmation flag is supplied by this named script; guard behavior is covered by database tests.

For the compiled application:

```sh
npm run build
npm start
```

Open [the production demo](http://127.0.0.1:3001). Migration/seed are still separate preparation steps. Stop application servers with Ctrl+C.

## Verify

With PostgreSQL reachable through `.env` or `DATABASE_URL`:

```sh
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:smoke
```

Integration tests create/drop isolated schemas; the role needs schema creation privileges. Browser tests start their own API/web on ports 3002/5174, wait for readiness, verify SQL persistence, and clean up their schema. The production smoke test starts the compiled server on port 3003 and checks HTML navigation, JSON errors, and actual built assets.

See [verification evidence](docs/verification.md). Local verification and automated review are recorded there; the GitHub workflow has not run on a remote repository.

## Development evidence

The [GitHub workflow record](docs/github-workflow.md) contains actual feature commits and their checks. Business requirement/bug forms and a PR template are in `.github`; CI checks formatting, types, lint, PostgreSQL tests, build, browser workflows, and production serving. Actions are pinned to verified release commits.

This is solo development. Automated review is identified as automated. A remote repository was not supplied, so no GitHub Issue, PR, hosted CI success, or live deployment is claimed.

## Scope and limitations

This demo has no authentication, live GPS, sensor streaming, AI inference, or notifications. Incident counts are not a device-health score. It is configured for a local fictional-data demonstration; adding organizational access control would be a separate production requirement.

The [approved design](docs/superpowers/specs/2026-10-02-fleet-test-ops-design.md) and [implementation plan](docs/superpowers/plans/2026-10-02-fleet-test-ops.md) explain scope and acceptance criteria.

<details>
<summary><strong>日本語版を表示 / Japanese version</strong></summary>

## プロジェクト概要

車両テストの担当者が、利用可能な車両を確認し、テストの記録を調べ、不具合への対応を記録できるフルスタックのポートフォリオです。**React・TypeScript・Express・PostgreSQL**で実装しています。コード、コメント、画面表示、コミット、主要な開発資料は英語です。

車両、運転者、不具合のデータはすべて架空です。独自に提案した業務シナリオであり、Bosch社内の実際のシステムを再現したものではありません。

![ダッシュボード](docs/screenshots/overview.png)

[不具合管理画面](docs/screenshots/issues.png) · [スマートフォン表示](docs/screenshots/overview-mobile.png) · [不具合登録フォーム](docs/screenshots/issue-form-mobile.png)

## 業務上の操作の流れ

**重大な未解決の不具合を確認 → 関連車両とテスト記録を確認 → 不具合を解決・再オープン → 車両の稼働状態を更新 → 再読み込みして保存結果を確認**します。

| 画面           | 実装済みの機能                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| ダッシュボード | 現在の車両状況、期間別走行距離、日別・車両別グラフ、数値表、車両の検索・絞り込み・並べ替え・ページ送り |
| 車両詳細       | 期間指定のテスト履歴、運転者名の記録、走行距離、関連不具合数、稼働状態の保存                           |
| 不具合管理     | 車両とテスト記録の選択、登録、URLによる絞り込み、重要度・対応状況の変更、解決日時、再オープン          |

初期データは8台の車両、JSTの20日間にわたる60件のテスト、24件の不具合です。テストがない車両と、複数の不具合を持つテストも含みます。保存した変更によって表示件数は変わります。[5分間のデモ手順](docs/demo-walkthrough.md)を面接時の説明に利用できます。

## 指標の定義

| 指標                       | 対象と計算方法                                                                |
| -------------------------- | ----------------------------------------------------------------------------- |
| 車両数・現在利用可能な車両 | 全車両の現在の状態。利用可能とは`vehicles.status = 'available'`を指します     |
| 現在未解決の不具合         | 日付に関係なく、`open`または`in_progress`の全不具合                           |
| 完了済み走行距離・テスト数 | **開始時刻**が指定したJSTの日付範囲に入る完了済みテスト。中止・実施中は対象外 |
| 日別走行距離               | 同じ完了済みテストをJSTの開始日で集計。該当テストがない日は0                  |
| 車両別走行距離             | 同じ期間の集計。走行距離が0の登録車両も表示                                   |

画面の終了日は含まれます。SQLでは翌日のJST午前0時を含まないUTCの半開区間を使います。時刻はJST（UTC+09:00）、距離はkmです。走行距離を不具合との結合前に集計し、1件のテストに複数の不具合があっても距離が重複しないようにしています。未記録の距離は説明付きのダッシュで表示します。

## アーキテクチャと技術構成

![アプリケーション構成図](docs/architecture.svg)

[HTML版の構成図](docs/architecture.html)はダウンロードしてブラウザーで開けます。architecture-diagramスキルのコピー・PNG・PDFツールバーを保持しています。GitHub上では静的SVGをそのまま表示できます。画像・PDF出力は固定バージョンの外部ライブラリを使うため、ネットワーク接続が必要です。ブラウザーでの描画は確認済みですが、自動ダウンロードの取得は確認できませんでした。

| 層             | 技術                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| フロントエンド | React、TypeScript、Vite、React Router、Recharts、同梱のIBM Plexフォント       |
| API            | Node.js 24、Express 5、パラメータ化したPostgreSQLクエリ                       |
| 入出力         | 共有TypeScript型とZodによる入力検証                                           |
| データベース   | PostgreSQL 17、バージョン管理したSQLマイグレーション、再実行可能な初期データ  |
| テスト         | Vitest、Testing Library、Supertest、実際のPostgreSQL、Playwright Chromium     |
| 開発プロセス   | 機能ごとのコミット、Issue・PRテンプレート、固定リビジョンのGitHub Actions設定 |

開発時はViteの`/api`プロキシを使います。本番用ビルドではExpressが画面とAPIを同じオリジンで提供します。車両詳細URLを直接開いても画面を表示し、存在しないAPIはJSONの404を返します。データベースの接続情報はサーバー側に保持します。古い読み取りリクエストをキャンセル・無効化し、遅れて届いた応答が新しい絞り込み結果を上書きしないようにしています。

## SQLデータモデル

![車両・テスト記録・不具合の関係図](docs/erd.svg)

- `vehicles`：一意の車両番号、車両情報、現在の稼働状態。
- `test_runs`：1台の車両に紐づく履歴。運転者名を当時の記録として保存し、開始・終了時刻、状態、距離を保持します。
- `issues`：1件のテストに紐づく不具合。種類、説明、重要度、対応状況、解決日時を保持します。

不具合の車両はテスト記録から取得するため、`issues`に`vehicle_id`を重複保存しません。外部キー、非負の距離、時刻の前後関係、完了テストの必須項目、状態、説明文の長さ、解決日時の整合性をSQL制約で保証します。`schema_migrations`は適用済みバージョンを記録する補助テーブルです。

[データモデルの設計理由](docs/database-model.md)と[マイグレーション](database/migrations/001_initial.sql)を参照してください。

## ローカル環境での起動

**Node.js 24.x、npm、PostgreSQL 17**が必要です。`node --version`を確認し、リポジトリのルートで実行してください。新しく取得した環境では：

```sh
npm ci
cp .env.example .env
```

インストール時に共有型パッケージを自動ビルドします。データベースの準備方法を選びます。

- **インストール済みPostgreSQL：** [ネイティブ環境の準備手順](docs/local-postgresql.md)に従うか、専用の既存ローカルDBを`DATABASE_URL`に指定します。PostgreSQL 17.5とNode 24.21.0で、依存関係の新規インストールと空DBからの起動を確認しています。
- **Dockerを使う場合：** `docker compose up -d --wait`を実行します。PostgreSQL 17をループバックの5433番ポートで起動し、`.env.example`のサンプル接続情報を使います。設定は用意していますが、ローカルのDockerが停止していたため起動自体は未検証です。

空いているポートを使い、必要に応じて`DATABASE_URL`を変更してください。その後：

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

[ローカルデモ](http://127.0.0.1:5173)を開きます。APIは127.0.0.1:3001で動作します。開発中は両アプリケーションと共有型の変更を監視します。

マイグレーションは適用履歴を管理し、初期データの再実行は既存の変更を保持します。初期データの日付は最初に作成した時点を基準にします。日付を新しくしたデモデータに意図的に戻す場合：

```sh
npm run db:reset-demo
```

**リセットは`issues`、`test_runs`、`vehicles`に保存した変更を置き換えます。** ループバックの`fleet_ops`というDBに限定し、マイグレーション履歴を保持します。通常の起動とは独立しており、名前付きスクリプトが明示的な確認フラグを渡します。ガードの動作はDBテストで確認しています。

本番用ビルドを起動する場合：

```sh
npm run build
npm start
```

[本番ビルドのデモ](http://127.0.0.1:3001)を開きます。マイグレーションと初期データ投入は別途必要です。アプリケーションはCtrl+Cで停止します。

## 検証

`.env`または`DATABASE_URL`でPostgreSQLに接続できる状態で：

```sh
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:smoke
```

結合テストは独立したスキーマを作成・削除するため、利用するDBロールにスキーマ作成権限が必要です。ブラウザーテストは専用のAPI・Webサーバー（3002/5174番）を起動し、準備状態を待ってSQLへの保存を確認し、終了後にスキーマを削除します。本番スモークテストはコンパイル済みサーバーを3003番で起動し、ページ遷移、JSONエラー、ビルド済みファイルを確認します。

結果は[検証記録](docs/verification.md)を参照してください。ローカルでの確認と自動レビューを記録しています。GitHub上のCIはまだ実行していません。

## 開発の証跡と制限

[GitHubワークフローの記録](docs/github-workflow.md)に、実際の機能別コミットと検証結果があります。`.github`に業務要件・不具合のフォーム、PRテンプレート、CI設定を用意しています。Actionsは確認済みリリースのコミットに固定しています。

個人開発であり、自動レビューは自動レビューとして記載しています。公開先リポジトリは未指定のため、GitHub Issue・PRの作成、リモートCIの成功、公開デプロイは実施したとは記載していません。

認証、リアルタイムGPS、センサーストリーミング、AI推論、通知機能は対象外です。不具合数から機器の健全性スコアを算出していません。架空データを使ったローカルデモを想定しており、組織向けのアクセス制御は別途必要です。

[承認済みの設計書](docs/superpowers/specs/2026-10-02-fleet-test-ops-design.md)と[実装計画](docs/superpowers/plans/2026-10-02-fleet-test-ops.md)に範囲と受け入れ基準を記載しています。

</details>
