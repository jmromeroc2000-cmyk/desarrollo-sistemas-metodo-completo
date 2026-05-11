# Changelog

Todos los cambios notables de este proyecto se documentan aquí, siguiendo
[Keep a Changelog](https://keepachangelog.com/) y [Semantic Versioning](https://semver.org/lang/es/).

## Generación

Este changelog se genera automáticamente desde [conventional commits](https://www.conventionalcommits.org/)
vía `release-please` (configurar en `.github/workflows/release-please.yml`).

Mensajes de commit que alimentan el changelog:

| Tipo | Sección | Bump SemVer |
|------|---------|-------------|
| `feat(scope):` | Added | minor |
| `fix(scope):` | Fixed | patch |
| `perf(scope):` | Changed | patch |
| `refactor(scope):` | Changed | patch |
| `docs(scope):` | (no entra al changelog público) | — |
| `chore(scope):` | (no entra al changelog público) | — |
| `BREAKING CHANGE:` en body | Breaking | major |

Scopes convencionales: `be`, `fe`, `infra`, `meta`, `deps`.

## [Sin publicar]

_Pendientes que serán parte del próximo release._

## [0.1.0] — fecha-pendiente

### Added
- Bootstrap inicial del proyecto desde `DesarrolloSistemasMetodoCompleto` v1.1.0.
