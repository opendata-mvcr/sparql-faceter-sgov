(function() {

    'use strict';

    angular.module('facetApp')

    /*
    * The controller.
    */
    .controller('MainController', MainController);

    /* @ngInject */
    function MainController($scope, FacetHandler, service, facetUrlStateHandlerService) {
        var vm = this;

        var updateId = 0;

        vm.lang = 'cs';

        // page is the current page of results.
        vm.page = [];
        vm.pageNo = 0;
        vm.getPage = getPage;
        vm.makeArray = makeArray;    
        vm.setLang = setLang;
        vm.i18n = i18n;

        vm.disableFacets = disableFacets;
        $scope.isArray = angular.isArray;
        // Listen for the facet events
        // This event is triggered when a facet's selection has changed.
        $scope.$on('sf-facet-constraints', updateResults);
        // This is the initial configuration event
        var initListener = $scope.$on('sf-initial-constraints', function(event, cons) {
            updateResults(event, cons);
            // Only listen once, then unregister
            initListener();
        });
        
        $scope.getLabel = (o) => o.nazev ? o.nazev : o.id;
        
        // Get the facet configurations from dbpediaService.
        vm.facets = service.getFacets();
        // Initialize the facet handler
        vm.handler = new FacetHandler(getFacetOptions(vm.lang));

        function setLang(lang) {
          vm.lang = lang;
	  updateResults(null,vm.facetSelections);
	  vm.facets = service.getFacets();
	  vm.handler = new FacetHandler(getFacetOptions(vm.lang));
        }

        // Disable the facets while reusults are being retrieved.
        function disableFacets() {
            return vm.isLoadingResults;
        }

        // Setup the FacetHandler options.
        function getFacetOptions() {
            var options = service.getFacetOptions(vm.lang);
            options.scope = $scope;

            // Get initial facet values from URL parameters (refresh/bookmark) using facetUrlStateHandlerService.
            options.initialState = facetUrlStateHandlerService.getFacetValuesFromUrlParams();
            return options;
        }


        // Get results based on facet selections (each time the selections change).
        function updateResults(event, facetSelections) {
	    vm.facetSelections = facetSelections;
            // As the facets are not locked while the results are loading,
            // this function may be called again before the results have been
            // retrieved. This creates a race condition where the later call
            // may return before the first one, which leads to an inconsistent
            // state once the first returns. To avoid this we'll have a counter
            // that is incremented each time update is called, and we'll abort
            // the update if the counter has been incremented before it finishes.
            var uid = ++updateId;
            // As the user can also change the page via pagination, and introduce
            // a race condition that way, we'll want to discard any pending
            // page changes if a facet value changes. So set a boolean flag for
            // this purpose.
            vm.lock = true;
            // This variable is used to disable page selection, and display the
            // spinner animation.
            vm.isLoadingResults = true;

            // Update the URL parameters based on facet selections
            facetUrlStateHandlerService.updateUrlParams(facetSelections);

            // The dbpediaService returns a (promise of a) pager object.
            return service.getResults(facetSelections,vm.lang)
            .then(function(pager) {
                if (uid === updateId) {
                    vm.pager = pager;
                    vm.totalCount = pager.totalCount;
                    vm.pageNo = 1;
                    getPage(uid).then(function() {
                        vm.lock = false;
                        return vm.page;
                    });
                }
            });
        }

        // Get a page of mapped objects.
        // Angular-UI pagination handles the page number changes.
        function getPage(uid) {
            vm.isLoadingResults = true;
            // Get the page.
            // (The pager uses 0-indexed pages, whereas Angular-UI pagination uses 1-indexed pages).
            return vm.pager.getPage(vm.pageNo-1).then(function(page) {
                // Check if it's ok to change the page
                if (!vm.lock || (uid === updateId)) {
                    vm.page = page;
                    vm.isLoadingResults = false;
                }
            }).catch(function(error) {
                vm.error = error;
                vm.isLoadingResults = false;
            });
        }

        function makeArray(val) {
            return angular.isArray(val) ? val : [val];
        }

        function i18n(l) {
          const i18n = {
            'prohlizec-semantickeho-slovniku-pojmu' : {
              'cs' : 'Prohlížeč sémantického slovníku pojmů',
              'en' : 'Semantic Government Vocabulary Explorer'
            },
            'pojem' : {
              'cs' : 'Pojem',
              'en' : 'Term'
            },
            'informace' : {
              'cs' : 'Informace',
              'en' : 'Information'
            },
            'glosar' : {
              'cs' : 'Glosář',
              'en' : 'Glossary'
            },
            'je-specializaci' : {
              'cs' : 'je specializací',
              'en' : 'specializes'
            },
            'je-instanci-typu' : {
              'cs' : 'je instancí typu',
              'en' : 'has type'
            },
            'ma-vlastnosti-typu' : {
              'cs' : 'má vlastnosti typu',
              'en' : 'has intrinsic trope types'
            },
            'ma-vztahy-typu' : {
              'cs' : 'má vztahy typu',
              'en' : 'has relation types'
            }
          };      
          return i18n[l][vm.lang];
        }
    }
})();
