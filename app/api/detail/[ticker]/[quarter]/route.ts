import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/bigquery';
import type { AnomalyDetailRow } from '@/types/redink';

export const dynamic = 'force-dynamic';

const QUERY = `
  SELECT
    fi.ticker, fi.company_name, fi.cik,
    FORMAT_DATE('%Y-%m-%d', fi.report_date) AS report_date,
    fi.calendar_quarter, fi.gics_sector, fi.form_type,
    CAST(fi.filing_date AS STRING) AS filing_date,
    fi.filing_url,
    fi.anomaly_score_0_100, fi.mahalanobis_distance,
    fi.self_history_score, fi.peer_relative_score,
    fi.combined_signal_strength, fi.peer_count,
    fi.top_driver_1, fi.top_driver_1_value,
    fi.top_driver_2, fi.top_driver_2_value,
    fi.top_driver_3, fi.top_driver_3_value,
    fi.beneish_m_score, fi.beneish_manipulation_flag,
    fi.beneish_components_available,
    fi.beneish_dsri, fi.beneish_gmi, fi.beneish_aqi, fi.beneish_sgi,
    fi.beneish_depi, fi.beneish_sgai, fi.beneish_tata, fi.beneish_lvgi,
    fi.pillar_anomaly, fi.pillar_earnings, fi.pillar_transparency,
    fi.conviction_score, fi.conviction_tier,
    fi.pattern_name, fi.pattern_confidence, fi.pattern_summary,
    fi.explanation_brief,
    fi.divergence_label, fi.divergence_confidence,
    fi.mda_tone, fi.anomaly_acknowledged,
    fi.cited_passage, fi.divergence_rationale,
    fi.scoring_version, fi.scored_at, fi.conviction_computed_at,
    fi.filing_url IS NOT NULL AS filing_url_valid,
    -- Investigation Brief fields (from analyst_actions)
    aa.investigation_path, aa.key_question, aa.persistence_test,
    aa.priority_section, aa.urgency_tier, aa.filing_section_rationale,
    aa.model_version AS investigation_model_version,
    aa.generated_at AS investigation_generated_at,
    -- Golden case anchor (only joined when is_blow_up_case = TRUE)
    (gc.ticker IS NOT NULL) AS is_blow_up_case,
    gc.case_notes
  FROM \`qqq-anomaly-lab.qqq_finance.filing_intelligence\` fi
  LEFT JOIN \`qqq-anomaly-lab.qqq_finance.analyst_actions\` aa
    USING (ticker, calendar_quarter)
  LEFT JOIN \`qqq-anomaly-lab.qqq_finance.golden_cases\` gc
    ON gc.ticker = fi.ticker
   AND gc.calendar_quarter = fi.calendar_quarter
   AND gc.is_blow_up_case = TRUE
  WHERE fi.ticker = @ticker
    AND fi.calendar_quarter = @calendar_quarter
  LIMIT 1
`;

export async function GET(
  _req: Request,
  { params }: { params: { ticker: string; quarter: string } }
) {
  const { ticker, quarter } = params;

  if (!ticker || !quarter) {
    return NextResponse.json({ error: 'ticker and quarter are required' }, { status: 400 });
  }

  try {
    const rows = await runQuery<AnomalyDetailRow>(QUERY, {
      ticker: ticker.toUpperCase(),
      calendar_quarter: quarter,
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error(`[/api/detail/${ticker}/${quarter}] BQ query failed:`, err);
    return NextResponse.json(
      { error: 'Failed to load anomaly detail' },
      { status: 500 }
    );
  }
}
