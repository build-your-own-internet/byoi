# Chapter Naming Alignment

Edit this file to decide canonical naming across TOC title, H1, and slug.

| Slug | TOC Title (frontmatter) | H1 (in content) | Section | DECISION |
|------|-------------------------|-----------------|---------|----------|
| `000-getting-started` | How does this work? | Prequel: How does this work? | Getting Started | Getting Started |
| `1.1-routing-getting-started` | First network | Getting Started | Routing | First network |
| `1.2-routing-smol-internet` | Smol Internet | Let's make an Internet(work) | Routing | Smol Internet |
| `1.3-routing-internet-chonk` | Internet CHONK | Let's make that Internet MOAR BIGGER | Routing | Internet CHONK |
| `1.4-routing-rip` | Automatic routes (RIP) | Automatic route configuration | Routing | Automatic route configuration |
| `2.1-name-resolution-1-getting-started` | Names: Getting started | Name Resolution | Name Resolution | Basic Name Resolution |
| `2.2-name-resolution-2-host-synchronization` | Names: Host sync | Name Resolution | Name Resolution | Automated Name Resolution |
| `2.3-name-resolution-3-simple-dns` | Names: Simple DNS | Name Resolution | Name Resolution | Simple DNS |
| `2.4-name-resolution-recursive-dns` | Recursive DNS | Recursive DNS | Name Resolution | Recursive DNS |
| `3.1-traceroute-getting-started` | Traceroute | Let's explore how we can see our internet | Debugging | Traceroute |

## Recommendations

- TOC titles should match H1s (or vice versa) for consistency
- Slugs don't need to match either (they're URLs), but should be descriptive
- The `# Prequel:` and `# Getting Started` duplicates are particularly confusing
