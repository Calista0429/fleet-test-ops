# Fleet Test Operations Dashboard

An automotive test-fleet portfolio project designed to demonstrate TypeScript, React, SQL data modeling, and a traceable GitHub development workflow.

**Project status:** Design approved; implementation plan prepared for review. Application implementation has not started; the architecture below describes the planned MVP.

This is an independent project with fictional sample data. The test-fleet scenario is a proposed business use case, not a description of Bosch's internal systems.

<details>
<summary><strong>日本語版を表示 / Japanese version</strong></summary>

## プロジェクト概要

車両テストの担当者が、車両の稼働状況、テスト履歴、不具合の対応状況を確認・更新できるWebアプリケーションを想定したポートフォリオです。TypeScript、React、SQLによるデータモデリング、GitHubを活用した開発プロセスを示すことを目的としています。

**現在の進捗：** 設計案は承認済みで、実装計画のレビューを待っている段階です。アプリケーションの実装はまだ開始していません。以下の構成図は、初期バージョンの設計を示しています。

本プロジェクトは独自に企画したもので、サンプルデータは架空のものです。Bosch社内の実際のシステムや業務を再現したものではありません。

## 解決する業務上の課題

テスト担当者は、利用可能な車両、実施済みテストの走行距離、未解決の不具合を把握し、関連するテスト履歴を調べて対応状況を更新する必要があります。

想定する操作の流れは、**重大な未解決の不具合を確認 → 関連車両とテスト履歴を確認 → 不具合の対応状況を更新 → 車両の稼働状態を更新 → ダッシュボードで保存結果を確認**です。

## 初期バージョンの機能

| 画面 | 想定する機能 |
| --- | --- |
| ダッシュボード | 現在の車両状況、期間別のテスト走行距離、グラフ、車両一覧 |
| 車両詳細 | テスト履歴、関連する不具合、車両の稼働状態の更新 |
| 不具合管理 | 不具合の登録、絞り込み、重要度と対応状況の更新 |

期間指定はテスト履歴の集計に適用します。車両の稼働状況と未解決の不具合数は、全車両の現在の状態を示します。時刻はJSTで表示し、走行距離の単位はkmです。

## 技術構成

| 層 | 採用予定の技術 |
| --- | --- |
| フロントエンド | React、TypeScript、Vite、Recharts |
| API | Node.js、Express、TypeScript |
| 入出力の検証 | 共有のTypeScript型とZodスキーマ |
| データベース | PostgreSQL、SQLマイグレーション、パラメータ化クエリ |
| ローカル環境 | npm workspaces、PostgreSQL用のDocker Compose |
| 開発プロセス | GitHub Issues、機能ブランチ、Pull Request、GitHub Actions |

## アーキテクチャ

![アプリケーションの構成図](docs/architecture.svg)

[HTML版の構成図](docs/architecture.html)は、ダウンロードしてブラウザーで開くことができます。画像・PDFのエクスポート機能も付属しています。

ブラウザーはAPIを経由してデータを読み書きします。データベースの接続情報をブラウザーに渡すことはありません。開発プロセスを示すGitHubの構成は、アプリケーションの実行時の通信とは分けて表示しています。

## SQLデータモデル

![車両・テスト履歴・不具合の関係図](docs/erd.svg)

- `vehicles`：車両情報と現在の稼働状態。
- `test_runs`：車両に紐づくテスト履歴。1台の車両に複数のテスト履歴を登録できます。
- `issues`：テスト履歴に紐づく不具合。1回のテストに複数の不具合を登録できます。

不具合の車両はテスト履歴を通じて特定し、`issues`に重複して保存しません。車両番号の一意性、外部キー、走行距離、開始・終了時刻、解決日時の整合性をSQLの制約で保証する設計です。

## 開発と検証

コード、コメント、UI、コミット、Issue、PR、主要ドキュメントは英語で作成します。GitHubの作業記録には、実際の要件、変更、検証結果を記載します。

PostgreSQLを使用した結合テスト、型チェック、Lint、ビルド、主要な操作フローのブラウザーテストを計画しています。ローカル環境の起動手順は、実装後に実際に確認したコマンドを追加します。

詳細は[設計書](docs/superpowers/specs/2026-10-02-fleet-test-ops-design.md)と[実装計画](docs/superpowers/plans/2026-10-02-fleet-test-ops.md)を参照してください。

## 初期バージョンの対象外

リアルタイムGPS、センサーのストリーミング、AI推論、ユーザー認証、通知機能は初期バージョンに含めません。不具合情報だけから機器の健全性スコアを算出することもしません。

</details>

## Business problem

A test coordinator needs to identify available vehicles, review completed test distance, and follow up on unresolved operational issues.

The intended demonstration is: **find a severe unresolved issue → inspect its vehicle and test run → update the issue → update the vehicle's operational status → verify the persisted result in the overview.**

## Planned MVP

| Screen | Capabilities |
| --- | --- |
| Overview | Current fleet status, selected-period test distance, charts, vehicle table |
| Vehicle details | Test history, related issues, operational-status updates |
| Issue management | Issue creation, filtering, severity and status updates |

The date range filters historical test aggregates. Vehicle availability and unresolved-issue counts describe the whole fleet's current state. Times are displayed in JST and distances in kilometers.

## Technology choices

| Layer | Planned technology |
| --- | --- |
| Web | React, TypeScript, Vite, Recharts |
| API | Node.js, Express, TypeScript |
| Validation | Shared TypeScript types and Zod schemas |
| Database | PostgreSQL, SQL migrations, parameterized queries |
| Local setup | npm workspaces, Docker Compose for PostgreSQL |
| Development workflow | GitHub Issues, feature branches, pull requests, GitHub Actions |

## Architecture

![Planned application architecture](docs/architecture.svg)

[Open the HTML diagram](docs/architecture.html) by downloading it and opening it in a browser. It includes copy, PNG, and PDF export controls.

The browser reads and writes through the API; database credentials stay on the server. The GitHub development workflow is shown separately from runtime traffic. The diagram was created using the architecture-diagram skill (v1.1, by Cocoon AI).

## SQL model

![Vehicle, test-run, and issue relationships](docs/erd.svg)

- `vehicles` records vehicle identity and current operational status.
- `test_runs` belongs to one vehicle; a vehicle may have many test runs.
- `issues` belongs to one test run; a test run may have many issues.

An issue's vehicle is derived through its test run, avoiding a duplicated foreign key. The design includes unique license plates, foreign keys, nonnegative distances, valid time ordering, and consistent resolution timestamps.

## Development and verification

Code, comments, interface copy, commits, Issues, PRs, and primary documentation use English. The Japanese documentation is available in the expandable section above.

Development records will describe real requirements, changes, and verification. Planned checks include PostgreSQL integration tests, type checks, lint, a production build, and a browser test of the central workflow. Local setup instructions will be added after the implemented commands have been verified.

See the [written design](docs/superpowers/specs/2026-10-02-fleet-test-ops-design.md) for exact scope, metric definitions, API responsibilities, and acceptance criteria, and the [implementation plan](docs/superpowers/plans/2026-10-02-fleet-test-ops.md) for the five development tasks.

## Initial limitations

The MVP excludes live GPS, sensor streaming, AI inference, user authentication, and notifications. Incident records do not imply a device-health score.
