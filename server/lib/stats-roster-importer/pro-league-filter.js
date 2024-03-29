'use strict';

const {set} = require('lodash');

/**
 * Keeps track of which leagues our app cares about
 */
module.exports = {
  /**
   * @return {Promise<Array<string>>} Stats.com league paths
   */
  fetchWhitelist: async function() {
    /*
    @todo
    These leagues can be hardcoded for the MVP.
    Later we probably want to store them in the DB,
    like in a key-value application options table.
    Hence all the async boilerplate.
    */
    return [
      'mls',
      'epl',
      'seriea',
      'liga',
      'fran',
      'bund',
      // 'natl', // FIFA World Cup
      // 'wwc', // FIFA Women's World Cup @todo Get permissioned from Stats.com
    ];
  },

  /**
   * @return {Promise<Array<string>>} Stats.com league paths
   */
  fetchBlacklist: async function() {
    return [
      // Can't load team data
      'wusa',
      'misl',
      'wwc',
      'wps',
      'ger_lg_pkl',
      'blg_po',
      'ghan_super6',
      'conwpoly',
      'seriec2',
      'super',
      'mali',
      'tt',
      'togo',
      'euro',
      'euro_qual',
      'copa',
      'jleague_po',
      'witb',
      'copa_xtra',
      'oly_wsoc',
      'swis_ply',
      'afc_oly',
      'vod',
      'conc_preoly',
      'belg_ply',
      'serieb_ply',
      'fat',
      'aff',
      'oly_msoc',
      'mexi',
      'pol_pe',

      // Can't load participant data
      'qat_u23',
      'qat_super',
      'lmx',
      // 'bund',
      'eng_ch',
      'serieb',
      'bund2',
      'liga2',
      'arge',
      'chil',
      'chlg',
      'fmf1a',
      'braz',
      'lib',
      'caf',
      'afc',
      'gree',
      'holl',
      'port',
      'scot',
      'turk',
      'belg',
      'klg',
      'jlg',
      'chin',
      'swit2',
      'alb',
      'col_copa',
      'holl2',
      'fran3',
      'slove',
      'engd2',
      'gua',
      'cyp',
      'cdi',
      'argeb',
      'aust',
      'iran',
      'engd1',
      'wale',
      'fran2',
      'safr',
      'ksa',
      'qata',
      'swit',
      'swed',
      'pola',
      'isrl',
      'ghan',
      'belg2',
      'bulg',
      'uae',
      'port2',
      'serb',
      'ango',
      'sen',
      'croa',
      'czec',
      'crc',
      'ecu',
      'par',
      'uru',
      'mar',
      'brazb',
      'gold',
      'egy',
      'kuw',
      'russ',
      'ukr',
      'aut',
      'den',
      'nor',
      'tun',
      'roma',
      'seriec1',
      'europa',
      'nige',
      'slova',
      'scot1',
      'scot2',
      'sud',
      'conf',
      'fifa_u20',
      'jlg2',
      'ync',
      'scot3',
      'eng_conf',
      'eng_lg_cup',
      'eng_fa_cup',
      'ger_dfb_pkl',
      'sco_fa_cup',
      'sco_lg_cup',
      'sco_ch_cup',
      'francup',
      'spa_copa',
      'coppa_ita',
      'ned_knvb',
      'bel_beker',
      'acn',
      'xcup',
      'bund3',
      'aut2',
      'braz_cc',
      'braz_cp',
      'braz_cup',
      'croa_cup',
      'cmfs',
      'finl',
      'finl2',
      'gree_cup',
      'hung_cup',
      'irel',
      'isrl_cup',
      'kor_fa_cup',
      'latv',
      'mac',
      'msl',
      'mpl',
      'peru',
      'pol_i',
      'pol_remes',
      'port_cup',
      'port_tdp',
      'sing_cup',
      'slg',
      'turk_cup',
      'fran_lg_cup',
      'elt',
      'dtch',
      'scot1_ply',
      'scot2_ply',
      'uefa_u21',
      'uae_cup',
      'indi',
      'indf',
      'vene',
      'afc_acup',
      'afc_u19',
      'afc_u16',
      'bund_ply',
      'bund2_ply',
      'us_open_cup',
      'jp_emp_cup',
      'nasl',
      'brazc',
      'ifap',
      'conm_u20',
      'fifa_club',
      'fifa_u17',
      'conc_u17',
      'conc_u20',
      'conc_chlg',
      'copa_arg',
      'recopa_sud',
      'algr',
      'jord',
      'cif',
      'gulf',
      'swed_ply',
      'skc',
      'scp',
      'alga',
      'wwc_frnd',
      'nwsl',
      'qata_ply',
      'safr_ply',
      'egy_cup',
      'scot_ply',
      'ocnawcqf',
      'cncfwcqf',
      'afcwcqf',
      'uefawcqf',
      'asiawcqf',
      'cmblwcqf',
      'indo',
      'thai',
      'viet',
      'pufl',
      'hk1',
      'lith',
      'nzfc',
      'cafcup',
      'agmen',
      'agwomen',
      'india_sl',
      'natl_frnd',
      'concwchmp',
      'acn_qual',
      'wcicpo',
      'belsuper',
      'argsuper',
      'nedshield',
      'engshield',
      'frasuper',
      'gersuper',
      'itasuper',
      'spasuper',
      'uaesuper',
      'uefasuper',
      'caf_super',
      'intl_champ',
      'finl_ply',
      'sbc',
      'j3',
      'afna',
      'cafu20',
      'ncaamsoc',
      'ncaawsoc',
      'cosa_cup',
      'qatar_cup',
      'qat_emir_cp',
      'sa_diski',
      'sa_cbl_cup',
      'sa_fa_cup',
      'sa_ko_cup',
      'sa_wafa',
      'sa_nfd',
      'uae_pres_cp',
      'uefa_w_cl',
      'zimb',
      'segu',
      'egysuper',
      'fran1po',
      'denpo',
      'kenya',
      'moza',
      'bots',
      'zamb',
      'spa_honor_juv',
      'ksapo',
      'fran2po',
      'mx_copa',
      'lmx_fem',
      'esp_women',
      'uefa_nl',
      'sa_shield',
      'arab',
      'super_mx',

      // Can't load event data
      'natl',
    ];
  },

  /**
   * Fetch all ProLeague instances from the DB, filtered by the whitelist and blacklist
   * @param {l.LoopbackApplication} app App from which to load the ProLeague model
   * @param {object} [queryOptions] Additional options to pass to ProLeague.find()
   * @return {Promise<Array<ProLeague>>}
   */
  fetchFilteredProLeagues: async function(app, queryOptions = {}) {
    const whitelist = await this.fetchWhitelist();
    const blacklist = await this.fetchBlacklist();

    if (whitelist.length)
      set(queryOptions, 'where.statsPath.inq', whitelist);
    if (blacklist.length)
      set(queryOptions, 'whitelist.statsPath.nin', blacklist);

    return app.models.ProLeague.find(queryOptions);
  },
};
