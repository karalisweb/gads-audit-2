import { Injectable } from '@nestjs/common';
import { Decision } from '../../entities/decision.entity';

interface CsvRow {
  [key: string]: string | number | null;
}

interface GeneratedFile {
  filename: string;
  content: string;
  rows: number;
}

@Injectable()
export class CsvGeneratorService {
  generateCsvFiles(decisions: Decision[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    const groupedByType = this.groupDecisionsByEntityType(decisions);

    if (groupedByType.campaign?.length) {
      files.push(this.generateCampaignCsv(groupedByType.campaign));
    }

    if (groupedByType.ad_group?.length) {
      files.push(this.generateAdGroupCsv(groupedByType.ad_group));
    }

    if (groupedByType.keyword?.length) {
      files.push(this.generateKeywordCsv(groupedByType.keyword));
    }

    if (groupedByType.negative_keyword_campaign?.length) {
      files.push(this.generateNegativeKeywordCampaignCsv(groupedByType.negative_keyword_campaign));
    }

    if (groupedByType.negative_keyword_adgroup?.length) {
      files.push(this.generateNegativeKeywordAdGroupCsv(groupedByType.negative_keyword_adgroup));
    }

    if (groupedByType.ad?.length) {
      files.push(this.generateAdCsv(groupedByType.ad));
    }

    if (groupedByType.sitelink?.length) {
      files.push(this.generateSitelinkCsv(groupedByType.sitelink));
    }

    if (groupedByType.call_extension?.length) {
      files.push(this.generateCallExtensionCsv(groupedByType.call_extension));
    }

    return files;
  }

  private groupDecisionsByEntityType(decisions: Decision[]): Record<string, Decision[]> {
    return decisions.reduce((acc, decision) => {
      const type = decision.entityType.toLowerCase();
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(decision);
      return acc;
    }, {} as Record<string, Decision[]>);
  }

  private generateCampaignCsv(decisions: Decision[]): GeneratedFile {
    const headers = ['Campaign', 'Campaign state', 'Budget', 'Bid Strategy Type', 'Target CPA', 'Target ROAS'];
    const rows: CsvRow[] = [];

    for (const decision of decisions) {
      const afterValue = decision.afterValue || {};
      const row: CsvRow = {
        Campaign: decision.entityName || '',
        'Campaign state': this.mapStatus(afterValue.status as string),
        Budget: this.formatMicros(afterValue.budget_micros as number),
        'Bid Strategy Type': afterValue.bidding_strategy_type as string || '',
        'Target CPA': this.formatMicros(afterValue.target_cpa_micros as number),
        'Target ROAS': afterValue.target_roas as number || '',
      };
      rows.push(row);
    }

    return {
      filename: 'campaigns.csv',
      content: this.toCsv(headers, rows),
      rows: rows.length,
    };
  }

  private generateAdGroupCsv(decisions: Decision[]): GeneratedFile {
    const headers = ['Campaign', 'Ad Group', 'Ad Group state', 'Max CPC', 'Target CPA'];
    const rows: CsvRow[] = [];

    for (const decision of decisions) {
      const afterValue = decision.afterValue || {};
      const evidence = decision.evidence || {};
      const row: CsvRow = {
        Campaign: evidence.campaign_name as string || '',
        'Ad Group': decision.entityName || '',
        'Ad Group state': this.mapStatus(afterValue.status as string),
        'Max CPC': this.formatMicros(afterValue.cpc_bid_micros as number),
        'Target CPA': this.formatMicros(afterValue.target_cpa_micros as number),
      };
      rows.push(row);
    }

    return {
      filename: 'ad_groups.csv',
      content: this.toCsv(headers, rows),
      rows: rows.length,
    };
  }

  private generateKeywordCsv(decisions: Decision[]): GeneratedFile {
    const headers = ['Campaign', 'Ad Group', 'Keyword', 'Match type', 'Max CPC', 'Final URL', 'Status'];
    const rows: CsvRow[] = [];

    for (const decision of decisions) {
      const afterValue = decision.afterValue || {};
      const evidence = decision.evidence || {};

      const row: CsvRow = {
        Campaign: evidence.campaign_name as string || '',
        'Ad Group': evidence.ad_group_name as string || '',
        Keyword: decision.entityName || afterValue.keyword_text as string || '',
        'Match type': this.mapMatchType(afterValue.match_type as string),
        'Max CPC': this.formatMicros(afterValue.cpc_bid_micros as number),
        'Final URL': afterValue.final_url as string || '',
        Status: this.mapStatus(afterValue.status as string),
      };
      rows.push(row);
    }

    return {
      filename: 'keywords.csv',
      content: this.toCsv(headers, rows),
      rows: rows.length,
    };
  }

  private generateNegativeKeywordCampaignCsv(decisions: Decision[]): GeneratedFile {
    const headers = ['Campaign', 'Negative keyword', 'Match type'];
    const rows: CsvRow[] = [];

    for (const decision of decisions) {
      const afterValue = decision.afterValue || {};
      const evidence = decision.evidence || {};

      const row: CsvRow = {
        Campaign: evidence.campaign_name as string || '',
        'Negative keyword': decision.entityName || afterValue.keyword_text as string || '',
        'Match type': this.mapMatchType(afterValue.match_type as string),
      };
      rows.push(row);
    }

    return {
      filename: 'negative_keywords_campaign.csv',
      content: this.toCsv(headers, rows),
      rows: rows.length,
    };
  }

  private generateNegativeKeywordAdGroupCsv(decisions: Decision[]): GeneratedFile {
    const headers = ['Campaign', 'Ad Group', 'Negative keyword', 'Match type'];
    const rows: CsvRow[] = [];

    for (const decision of decisions) {
      const afterValue = decision.afterValue || {};
      const evidence = decision.evidence || {};

      const row: CsvRow = {
        Campaign: evidence.campaign_name as string || '',
        'Ad Group': evidence.ad_group_name as string || '',
        'Negative keyword': decision.entityName || afterValue.keyword_text as string || '',
        'Match type': this.mapMatchType(afterValue.match_type as string),
      };
      rows.push(row);
    }

    return {
      filename: 'negative_keywords_adgroup.csv',
      content: this.toCsv(headers, rows),
      rows: rows.length,
    };
  }

  private generateAdCsv(decisions: Decision[]): GeneratedFile {
    const headers = [
      'Campaign', 'Ad Group',
      'Headline 1', 'Headline 2', 'Headline 3', 'Headline 4', 'Headline 5',
      'Headline 6', 'Headline 7', 'Headline 8', 'Headline 9', 'Headline 10',
      'Headline 11', 'Headline 12', 'Headline 13', 'Headline 14', 'Headline 15',
      'Description 1', 'Description 2', 'Description 3', 'Description 4',
      'Final URL', 'Path 1', 'Path 2', 'Status',
    ];
    const rows: CsvRow[] = [];

    for (const decision of decisions) {
      const afterValue = decision.afterValue || {};
      const evidence = decision.evidence || {};
      const headlines = (afterValue.headlines as { text: string }[]) || [];
      const descriptions = (afterValue.descriptions as { text: string }[]) || [];

      const row: CsvRow = {
        Campaign: evidence.campaign_name as string || '',
        'Ad Group': evidence.ad_group_name as string || '',
        'Final URL': this.getFirstUrl(afterValue.final_urls as string[]),
        'Path 1': afterValue.path1 as string || '',
        'Path 2': afterValue.path2 as string || '',
        Status: this.mapStatus(afterValue.status as string),
      };

      for (let i = 0; i < 15; i++) {
        row[`Headline ${i + 1}`] = headlines[i]?.text || '';
      }

      for (let i = 0; i < 4; i++) {
        row[`Description ${i + 1}`] = descriptions[i]?.text || '';
      }

      rows.push(row);
    }

    return {
      filename: 'ads.csv',
      content: this.toCsv(headers, rows),
      rows: rows.length,
    };
  }

  private generateSitelinkCsv(decisions: Decision[]): GeneratedFile {
    const headers = ['Campaign', 'Sitelink text', 'Description line 1', 'Description line 2', 'Final URL', 'Status'];
    const rows: CsvRow[] = [];

    for (const decision of decisions) {
      const afterValue = decision.afterValue || {};
      const evidence = decision.evidence || {};

      const row: CsvRow = {
        Campaign: evidence.campaign_name as string || '',
        'Sitelink text': afterValue.asset_text as string || '',
        'Description line 1': afterValue.description1 as string || '',
        'Description line 2': afterValue.description2 as string || '',
        'Final URL': afterValue.final_url as string || '',
        Status: this.mapStatus(afterValue.status as string),
      };
      rows.push(row);
    }

    return {
      filename: 'sitelinks.csv',
      content: this.toCsv(headers, rows),
      rows: rows.length,
    };
  }

  private generateCallExtensionCsv(decisions: Decision[]): GeneratedFile {
    const headers = ['Campaign', 'Phone number', 'Country code', 'Status'];
    const rows: CsvRow[] = [];

    for (const decision of decisions) {
      const afterValue = decision.afterValue || {};
      const evidence = decision.evidence || {};

      const row: CsvRow = {
        Campaign: evidence.campaign_name as string || '',
        'Phone number': afterValue.phone_number as string || '',
        'Country code': afterValue.country_code as string || 'IT',
        Status: this.mapStatus(afterValue.status as string),
      };
      rows.push(row);
    }

    return {
      filename: 'call_extensions.csv',
      content: this.toCsv(headers, rows),
      rows: rows.length,
    };
  }

  private toCsv(headers: string[], rows: CsvRow[]): string {
    const headerLine = headers.map(h => this.escapeCsvValue(h)).join(',');
    const dataLines = rows.map(row =>
      headers.map(h => this.escapeCsvValue(row[h])).join(',')
    );
    return [headerLine, ...dataLines].join('\n');
  }

  private escapeCsvValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private formatMicros(micros: number | null | undefined): string {
    if (!micros) return '';
    return (micros / 1_000_000).toFixed(2);
  }

  private mapStatus(status: string | null | undefined): string {
    if (!status) return '';
    const statusMap: Record<string, string> = {
      ENABLED: 'enabled',
      PAUSED: 'paused',
      REMOVED: 'removed',
      enabled: 'enabled',
      paused: 'paused',
      removed: 'removed',
    };
    return statusMap[status] || status.toLowerCase();
  }

  private mapMatchType(matchType: string | null | undefined): string {
    if (!matchType) return '';
    const matchMap: Record<string, string> = {
      EXACT: 'Exact',
      PHRASE: 'Phrase',
      BROAD: 'Broad',
      exact: 'Exact',
      phrase: 'Phrase',
      broad: 'Broad',
    };
    return matchMap[matchType] || matchType;
  }

  private getFirstUrl(urls: string[] | null | undefined): string {
    if (!urls || urls.length === 0) return '';
    return urls[0];
  }

  generateReadme(files: GeneratedFile[], changeSetName: string, accountName: string): string {
    const now = new Date().toISOString();

    let readme = `# Google Ads Editor Export
=====================================

**Change Set:** ${changeSetName}
**Account:** ${accountName}
**Generated:** ${now}

## Files Included

`;

    for (const file of files) {
      readme += `- **${file.filename}** - ${file.rows} rows\n`;
    }

    readme += `
## Import Instructions

1. Open Google Ads Editor
2. Select your account: ${accountName}
3. Go to **Account** > **Import**
4. Choose **From file**
5. Select the CSV files one at a time
6. Review the proposed changes
7. Click **Post changes** when ready

## Important Notes

- Always review changes before posting
- Make a backup of your account before applying changes
- Test on a small subset first if you have many changes
- Some changes may require additional review (e.g., ads need approval)

## CSV File Details

### campaigns.csv
Updates to campaign settings including status, budget, and bidding.

### ad_groups.csv
Updates to ad group settings including status and bids.

### keywords.csv
Updates to keyword settings including status, match type, bids, and URLs.

### negative_keywords_campaign.csv
Negative keywords to add at campaign level.

### negative_keywords_adgroup.csv
Negative keywords to add at ad group level.

### ads.csv
Updates to responsive search ads including headlines and descriptions.

### sitelinks.csv
Updates to sitelink extensions.

### call_extensions.csv
Updates to call extensions.

---

Generated by Google Ads Audit App
`;

    return readme;
  }
}
