# GroupDrive Multilingual RAG Car Advisor Evaluation Report

**Status**: ✅ PASSED | **Benchmark Date**: 2026-10-31 | **Total Benchmark Questions**: 50

## 1. Executive Summary
| Metric | Achieved Score | Required Threshold | Result |
|---|---|---|---|
| **Faithfulness** | **0.854** | ≥ 0.85 | ✅ PASS |
| **Answer Relevance** | **0.875** | ≥ 0.85 | ✅ PASS |
| **Context Precision** | **0.918** | ≥ 0.8 | ✅ PASS |
| **Avg Request Latency** | **0.3 ms** | < 250 ms | ✅ PASS |

## 2. Category Breakdown
| Category | Questions | Faithfulness | Relevance | Context Precision |
|---|---|---|---|---|
| **Deals** | 10 | 0.933 | 0.824 | 0.967 |
| **Guardrails** | 10 | 0.533 | 0.666 | 0.933 |
| **Policies** | 15 | 0.933 | 0.98 | 0.956 |
| **Specs** | 15 | 0.937 | 0.944 | 0.839 |

## 3. Multilingual Coverage
| Language | Questions | Avg Relevance | Supported Dialects |
|---|---|---|---|
| **EN** | 25 | 0.874 | Standard English |
| **HINGLISH** | 16 | 0.89 | Latin script transliteration |
| **MR** | 9 | 0.85 | Devanagari script |

## 4. 50-Question Benchmark Detailed Results
| ID | Category | Language | Relevance | Faithfulness | Precision | Latency | Handoff |
|---|---|---|---|---|---|---|---|
| q01 | specs | hinglish | 1.0 | 1.0 | 1.0 | 3.6ms | No |
| q02 | specs | en | 1.0 | 1.0 | 1.0 | 1.0ms | No |
| q03 | specs | hinglish | 1.0 | 1.0 | 0.833 | 0.0ms | No |
| q04 | specs | en | 1.0 | 1.0 | 1.0 | 1.0ms | No |
| q05 | specs | mr | 0.376 | 0.5 | 1.0 | 0.0ms | No |
| q06 | specs | hinglish | 1.0 | 1.0 | 1.0 | 1.0ms | No |
| q07 | specs | en | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q08 | specs | hinglish | 1.0 | 1.0 | 0.333 | 1.0ms | No |
| q09 | specs | en | 1.0 | 1.0 | 0.833 | 0.0ms | No |
| q10 | specs | mr | 1.0 | 0.8 | 0.5 | 1.0ms | No |
| q11 | specs | en | 1.0 | 0.75 | 0.5 | 0.0ms | No |
| q12 | specs | hinglish | 0.783 | 1.0 | 1.0 | 1.0ms | No |
| q13 | specs | mr | 1.0 | 1.0 | 0.583 | 0.0ms | No |
| q14 | specs | en | 1.0 | 1.0 | 1.0 | 1.0ms | No |
| q15 | specs | hinglish | 1.0 | 1.0 | 1.0 | 0.5ms | No |
| q16 | policies | hinglish | 0.838 | 1.0 | 1.0 | 0.0ms | No |
| q17 | policies | en | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q18 | policies | en | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q19 | policies | hinglish | 0.957 | 1.0 | 1.0 | 0.0ms | No |
| q20 | policies | mr | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q21 | policies | en | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q22 | policies | hinglish | 0.957 | 1.0 | 1.0 | 0.0ms | No |
| q23 | policies | en | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q24 | policies | en | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q25 | policies | mr | 0.942 | 1.0 | 0.833 | 0.0ms | No |
| q26 | policies | en | 1.0 | 1.0 | 1.0 | 1.1ms | No |
| q27 | policies | hinglish | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q28 | policies | mr | 1.0 | 0.0 | 0.5 | 0.0ms | No |
| q29 | policies | en | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q30 | policies | hinglish | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q31 | deals | en | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q32 | deals | hinglish | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q33 | deals | en | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q34 | deals | mr | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q35 | deals | en | 0.219 | 1.0 | 0.833 | 0.0ms | No |
| q36 | deals | hinglish | 0.535 | 1.0 | 1.0 | 0.0ms | No |
| q37 | deals | hinglish | 1.0 | 1.0 | 1.0 | 0.0ms | No |
| q38 | deals | en | 0.584 | 0.6666666666666666 | 1.0 | 0.0ms | No |
| q39 | deals | mr | 0.9 | 0.6666666666666666 | 1.0 | 0.0ms | No |
| q40 | deals | en | 1.0 | 1.0 | 0.833 | 0.0ms | No |
| q41 | guardrails | hinglish | 0.608 | 0.5 | 1.0 | 0.0ms | Triggered |
| q42 | guardrails | en | 0.725 | 0.0 | 0.5 | 0.0ms | No |
| q43 | guardrails | en | 0.759 | 1.0 | 1.0 | 1.0ms | No |
| q44 | guardrails | en | 1.0 | 0.0 | 1.0 | 0.0ms | No |
| q45 | guardrails | mr | 0.435 | 0.6666666666666666 | 1.0 | 1.0ms | No |
| q46 | guardrails | en | 0.434 | 0.3333333333333333 | 1.0 | 0.0ms | No |
| q47 | guardrails | en | 0.796 | 0.3333333333333333 | 0.833 | 0.0ms | Triggered |
| q48 | guardrails | hinglish | 0.567 | 1.0 | 1.0 | 0.0ms | No |
| q49 | guardrails | en | 0.434 | 0.5 | 1.0 | 0.0ms | No |
| q50 | guardrails | en | 0.9 | 1.0 | 1.0 | 0.0ms | No |