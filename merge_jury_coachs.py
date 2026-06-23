#!/usr/bin/env python3
"""
Script to merge Liste_Coachs and Liste_Jury into the same structure
as participants_merged_hackathon_ctf.xlsx.

Output:
  - jury_coachs_merged.xlsx: entries that have an email
  - jury_coachs_sans_email.xlsx: entries that are missing an email
"""

import pandas as pd
import numpy as np

# ===== Reference columns from participants_merged_hackathon_ctf.xlsx =====
REF_COLUMNS = [
    'Source',
    'Référence',
    'Mode',
    'Équipe',
    'Nombre membres',
    'Thématique / Niveau',
    'Catégories / Spécialités',
    'Chef / Capitaine',
    'Rôle',
    'Nom complet',
    'Email',
    'Téléphone',
    'Genre',
    'Ville',
    'Statut',
    'Organisation / Établissement',
    'Formation',
    'Job dating',
    'Reçu le',
    'Observation',
]

def normalize_genre(g):
    """Normalize genre values to M/F."""
    if pd.isna(g):
        return np.nan
    g = str(g).strip().upper()
    if g in ('H', 'M'):
        return 'M'
    if g == 'F':
        return 'F'
    return g

def map_source(activite_or_lot):
    """Map Activité/Lot to Source (Hackathon or CTF)."""
    if pd.isna(activite_or_lot):
        return np.nan
    val = str(activite_or_lot).strip().upper()
    if 'HACKATHON' in val:
        return 'Hackathon'
    if 'CTF' in val:
        return 'CTF'
    return str(activite_or_lot).strip()

def process_coachs(filepath):
    """Process the Coachs file and return a DataFrame with REF_COLUMNS."""
    df = pd.read_excel(filepath)
    
    rows = []
    for _, r in df.iterrows():
        nom = r.get('nom')
        # Skip completely empty rows (no name at all)
        if pd.isna(nom) or str(nom).strip() == '':
            continue
        
        email = r.get('email')
        if isinstance(email, str):
            email = email.strip()
        
        row = {
            'Source': map_source(r.get('Activité')),
            'Référence': np.nan,
            'Mode': np.nan,
            'Équipe': np.nan,
            'Nombre membres': np.nan,
            'Thématique / Niveau': r.get('thematiques') if pd.notna(r.get('thematiques')) else np.nan,
            'Catégories / Spécialités': r.get('specialites') if pd.notna(r.get('specialites')) else np.nan,
            'Chef / Capitaine': np.nan,
            'Rôle': 'Coach',
            'Nom complet': str(nom).strip(),
            'Email': email if pd.notna(email) else np.nan,
            'Téléphone': r.get('telephone'),
            'Genre': normalize_genre(r.get('genre')),
            'Ville': r.get('ville'),
            'Statut': r.get('statut'),
            'Organisation / Établissement': r.get('organisation'),
            'Formation': np.nan,
            'Job dating': np.nan,
            'Reçu le': r.get('recu_le'),
            'Observation': np.nan,
        }
        rows.append(row)
    
    return pd.DataFrame(rows, columns=REF_COLUMNS)

def process_jury(filepath):
    """Process the Jury file and return a DataFrame with REF_COLUMNS."""
    df = pd.read_excel(filepath)
    
    rows = []
    for _, r in df.iterrows():
        nom = r.get('nom')
        email = r.get('email')
        
        # Skip completely empty rows (no name AND no email)
        if (pd.isna(nom) or str(nom).strip() == '') and (pd.isna(email) or str(email).strip() == ''):
            continue
        
        if isinstance(email, str):
            email = email.strip()
        if isinstance(nom, str):
            nom = nom.strip()
        
        poste = r.get('poste')
        if isinstance(poste, str):
            poste = poste.strip()
        
        row = {
            'Source': map_source(r.get('Lot')),
            'Référence': np.nan,
            'Mode': np.nan,
            'Équipe': np.nan,
            'Nombre membres': np.nan,
            'Thématique / Niveau': np.nan,
            'Catégories / Spécialités': np.nan,
            'Chef / Capitaine': np.nan,
            'Rôle': 'Jury',
            'Nom complet': nom if pd.notna(nom) else np.nan,
            'Email': email if pd.notna(email) else np.nan,
            'Téléphone': r.get('telephone'),
            'Genre': normalize_genre(r.get('genre')),
            'Ville': np.nan,
            'Statut': np.nan,
            'Organisation / Établissement': r.get('organisation'),
            'Formation': np.nan,
            'Job dating': np.nan,
            'Reçu le': np.nan,
            'Observation': poste if pd.notna(poste) else np.nan,  # Put poste in Observation for context
        }
        rows.append(row)
    
    return pd.DataFrame(rows, columns=REF_COLUMNS)


def main():
    # Process both files
    df_coachs = process_coachs('Liste_Coachs_candidatures_20260617_194923 (1).xlsx')
    df_jury = process_jury('Liste_Jury (1).xlsx')
    
    print(f"Coachs processed: {len(df_coachs)} entries")
    print(f"Jury processed: {len(df_jury)} entries")
    
    # Merge both into one
    df_all = pd.concat([df_coachs, df_jury], ignore_index=True)
    print(f"Total merged: {len(df_all)} entries")
    
    # Split by presence of email
    has_email = df_all['Email'].notna() & (df_all['Email'].astype(str).str.strip() != '')
    df_with_email = df_all[has_email].copy()
    df_without_email = df_all[~has_email].copy()
    
    print(f"  With email: {len(df_with_email)}")
    print(f"  Without email: {len(df_without_email)}")
    
    # Save to Excel files
    df_with_email.to_excel('jury_coachs_merged.xlsx', index=False)
    df_without_email.to_excel('jury_coachs_sans_email.xlsx', index=False)
    
    # Print summary
    print("\n=== jury_coachs_merged.xlsx ===")
    print(df_with_email[['Rôle', 'Nom complet', 'Email', 'Source']].to_string())
    
    print("\n=== jury_coachs_sans_email.xlsx ===")
    print(df_without_email[['Rôle', 'Nom complet', 'Email', 'Source']].to_string())
    
    # Verify columns match exactly
    ref_df = pd.read_excel('participants_merged_hackathon_ctf.xlsx')
    assert list(df_with_email.columns) == list(ref_df.columns), \
        f"Column mismatch!\nExpected: {list(ref_df.columns)}\nGot: {list(df_with_email.columns)}"
    assert list(df_without_email.columns) == list(ref_df.columns), \
        f"Column mismatch for sans_email!"
    
    print("\n✅ Columns verified — exact match with participants_merged_hackathon_ctf.xlsx")
    print("✅ Files saved: jury_coachs_merged.xlsx, jury_coachs_sans_email.xlsx")


if __name__ == '__main__':
    main()
