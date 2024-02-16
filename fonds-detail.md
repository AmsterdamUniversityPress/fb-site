---
# --- note, the name of this file doesn't matter (it's not referred to anywhere, but does get
# processed by the build). The `pagination` key with a size of 1, in combination with `permalink`,
# causes one page to be generated per data item in the JSON.

pagination:
    data: fb.fbdata
    size: 1
    alias: this_fonds
layout: mylayout.njk
permalink: "fonds/{{ this_fonds.uuid | slugify }}.html"
---
<div class='page-fonds-detail'>
  <div>
  Detail View
  </div>

  <p>
  Naam organisatie: <a target=_blank href="http://{{this_fonds.website}}">{{
  this_fonds.naam_organisatie }}</a>
  </p>

  <p>
  type_organisatie: {{ this_fonds.type_organisatie }}
  </p>

  <p>
  naam_moeder_organisatie: {{ this_fonds.naam_moeder_organisatie }}
  </p>

  <p>
  oprichtings_datum: {{ this_fonds.oprichtings_datum }}
  </p>

  <p>
  rechtsvorm: {{ this_fonds.rechtsvorm }}
  </p>

  <p>
  kvk_number: {{ this_fonds.kvk_number }}
  </p>

  <p>
  anbi_status: {{ this_fonds.anbi_status }}
  </p>

  <p>
  rsin: {{ this_fonds.rsin }}
  </p>

  <p>
  directeur_algemeen_geslacht: {{ this_fonds.directeur_algemeen_geslacht }}
  </p>

  <p>
  directeur_algemeen_voorletters: {{ this_fonds.directeur_algemeen_voorletters }}
  </p>

  <p>
  directeur_algemeen_tussenvoegsel: {{ this_fonds.directeur_algemeen_tussenvoegsel }}
  </p>

  <p>
  directeur_algemeen_achternaam: {{ this_fonds.directeur_algemeen_achternaam }}
  </p>

  <p>
  bestuursvoorzitter_geslacht: {{ this_fonds.bestuursvoorzitter_geslacht }}
  </p>

  <p>
  bestuursvoorzitter_voorletters: {{ this_fonds.bestuursvoorzitter_voorletters }}
  </p>

  <p>
  bestuursvoorzitter_tussenvoegsel: {{ this_fonds.bestuursvoorzitter_tussenvoegsel }}
  </p>

  <p>
  bestuursvoorzitter_achternaam: {{ this_fonds.bestuursvoorzitter_achternaam }}
  </p>

  <p>
  bestuurssecretaris_geslacht: {{ this_fonds.bestuurssecretaris_geslacht }}
  </p>

  <p>
  bestuurssecretaris_voorletters: {{ this_fonds.bestuurssecretaris_voorletters }}
  </p>

  <p>
  bestuurssecretaris_tussenvoegsel: {{ this_fonds.bestuurssecretaris_tussenvoegsel }}
  </p>

  <p>
  bestuurssecretaris_achternaam: {{ this_fonds.bestuurssecretaris_achternaam }}
  </p>

  <p>
  bestuurspenningmeester_geslacht: {{ this_fonds.bestuurspenningmeester_geslacht }}
  </p>

  <p>
  bestuurspenningmeester_voorletters: {{ this_fonds.bestuurspenningmeester_voorletters }}
  </p>

  <p>
  bestuurspenningmeester_tussenvoegsel: {{ this_fonds.bestuurspenningmeester_tussenvoegsel }}
  </p>

  <p>
  bestuurspenningmeester_achternaam: {{ this_fonds.bestuurspenningmeester_achternaam }}
  </p>

  <p>
  bestuurslid3_geslacht: {{ this_fonds.bestuurslid3_geslacht }}
  </p>

  <p>
  bestuurslid3_voorletters: {{ this_fonds.bestuurslid3_voorletters }}
  </p>

  <p>
  bestuurslid3_tussenvoegsel: {{ this_fonds.bestuurslid3_tussenvoegsel }}
  </p>

  <p>
  bestuurslid3_achternaam: {{ this_fonds.bestuurslid3_achternaam }}
  </p>

  <p>
  bestuurslid4_geslacht: {{ this_fonds.bestuurslid4_geslacht }}
  </p>

  <p>
  bestuurslid4_voorletters: {{ this_fonds.bestuurslid4_voorletters }}
  </p>

  <p>
  bestuurslid4_tussenvoegsel: {{ this_fonds.bestuurslid4_tussenvoegsel }}
  </p>

  <p>
  bestuurslid4_achternaam: {{ this_fonds.bestuurslid4_achternaam }}
  </p>

  <p>
  bestuurslid5_geslacht: {{ this_fonds.bestuurslid5_geslacht }}
  </p>

  <p>
  bestuurslid5_voorletters: {{ this_fonds.bestuurslid5_voorletters }}
  </p>

  <p>
  bestuurslid5_tussenvoegsel: {{ this_fonds.bestuurslid5_tussenvoegsel }}
  </p>

  <p>
  bestuurslid5_achternaam: {{ this_fonds.bestuurslid5_achternaam }}
  </p>

  <p>
  bestuurslid6_geslacht: {{ this_fonds.bestuurslid6_geslacht }}
  </p>

  <p>
  bestuurslid6_voorletters: {{ this_fonds.bestuurslid6_voorletters }}
  </p>

  <p>
  bestuurslid6_tussenvoegsel: {{ this_fonds.bestuurslid6_tussenvoegsel }}
  </p>

  <p>
  bestuurslid6_achternaam: {{ this_fonds.bestuurslid6_achternaam }}
  </p>

  <p>
  doelstelling: {{ this_fonds.doelstelling }}
  </p>

  <p>
  stichter: {{ this_fonds.stichter }}
  </p>

  <p>
  historie: {{ this_fonds.historie }}
  </p>

  <p>
  beleidsplan_op_website: {{ this_fonds.beleidsplan_op_website }}
  </p>

  <p>
  doelgroep: {{ this_fonds.doelgroep }}
  </p>

  <p>
  doelgroep_overig: {{ this_fonds.doelgroep_overig }}
  </p>

  <p>
  activiteiten_beschrijving: {{ this_fonds.activiteiten_beschrijving }}
  </p>

  <p>
  interventie_niveau: {{ this_fonds.interventie_niveau }}
  </p>

  <p>
  werk_regio: {{ this_fonds.werk_regio }}
  </p>

  <p>
  landen: {{ this_fonds.landen }}
  </p>

  <p>
  regio_in_nederland: {{ this_fonds.regio_in_nederland }}
  </p>

  <p>
  plaats_in_nederland: {{ this_fonds.plaats_in_nederland }}
  </p>

  <p>
  besteding_budget: {{ this_fonds.besteding_budget }}
  </p>

  <p>
  ondersteunde_projecten: {{ this_fonds.ondersteunde_projecten }}
  </p>

  <p>
  fin_fonds: {{ this_fonds.fin_fonds }}
  </p>

  <p>
  max_ondersteuning: {{ this_fonds.max_ondersteuning }}
  </p>

  <p>
  min_ondersteuning: {{ this_fonds.min_ondersteuning }}
  </p>

  <p>
  beschrijving_project_aanmerking: {{ this_fonds.beschrijving_project_aanmerking }}
  </p>

  <p>
  doorloop_tijd_act: {{ this_fonds.doorloop_tijd_act }}
  </p>

  <p>
  fonds_type_aanvraag: {{ this_fonds.fonds_type_aanvraag }}
  </p>

  <p>
  uitsluiting: {{ this_fonds.uitsluiting }}
  </p>

  <p>
  op_aanvraag: {{ this_fonds.op_aanvraag }}
  </p>

  <p>
  doorloop_tijd: {{ this_fonds.doorloop_tijd }}
  </p>

  <p>
  aanvraag_procedure: {{ this_fonds.aanvraag_procedure }}
  </p>

  <p>
  url_aanvraag_procedure: {{ this_fonds.url_aanvraag_procedure }}
  </p>

  <p>
  eigen_vermogen: {{ this_fonds.eigen_vermogen }}
  </p>

  <p>
  inkomsten_eigen_vermogen: {{ this_fonds.inkomsten_eigen_vermogen }}
  </p>

  <p>
  herkomst_middelen: {{ this_fonds.herkomst_middelen }}
  </p>

  <p>
  boekjaar: {{ this_fonds.boekjaar }}
  </p>

  <p>
  url_jaarverslag: {{ this_fonds.url_jaarverslag }}
  </p>

  <p>
  contact: {{ this_fonds.contact }}
  </p>

  <p>
  cpfinaanvragen_geslacht: {{ this_fonds.cpfinaanvragen_geslacht }}
  </p>

  <p>
  cpfinaanvragen_voorletters: {{ this_fonds.cpfinaanvragen_voorletters }}
  </p>

  <p>
  cpfinaanvragen_tussenvoegsel: {{ this_fonds.cpfinaanvragen_tussenvoegsel }}
  </p>

  <p>
  cpfinaanvragen_achternaam: {{ this_fonds.cpfinaanvragen_achternaam }}
  </p>

  <p>
  postadres_straat: {{ this_fonds.postadres_straat }}
  </p>

  <p>
  postadres_huisnummer: {{ this_fonds.postadres_huisnummer }}
  </p>

  <p>
  postadres_huisnummer_ext: {{ this_fonds.postadres_huisnummer_ext }}
  </p>

  <p>
  postadres_postcode: {{ this_fonds.postadres_postcode }}
  </p>

  <p>
  postadres_plaats: {{ this_fonds.postadres_plaats }}
  </p>

  <p>
  email: {{ this_fonds.email }}
  </p>

  <p>
  telefoon: {{ this_fonds.telefoon }}
  </p>

  <p>
  telefoon_fin_aanvragen: {{ this_fonds.telefoon_fin_aanvragen }}
  </p>

  <p>
  trefwoorden: {{ this_fonds.trefwoorden }}
  </p>
</div>
