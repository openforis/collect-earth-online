import React, { Fragment } from "react";
import ReactDOM from "react-dom";
import { mercator, ceoMapStyles } from "../js/mercator.js";
import { NavigationBar } from "./components/PageComponents";
import { SurveyCollection } from "./components/SurveyCollection";
import { convertSampleValuesToSurveyQuestions } from "./utils/surveyUtils";
import { UnicodeIcon, getQueryString } from "./utils/textUtils";
import { formatDateISO } from "./utils/dateUtils";

class Collection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            collectionStart: 0,
            currentProject: { surveyQuestions: [], institution: "" },
            currentImagery: { id: "", sourceConfig: {}},
            currentPlot: null,
            imageryAttribution: "",
            imageryList: [],
            imageryMonthPlanet: 3,
            imageryMonthNamePlanet: "March",
            imageryYearDG: 2009,
            imageryYearPlanet: 2018,
            imageryStartDatePlanetDaily: "",
            imageryEndDatePlanetDaily: "",
            imageryMonthSentinel1: "",
            imageryYearSentinel1: "",
            bandCombinationSentinel1: "",
            imageryMonthSentinel2: "",
            imageryYearSentinel2: "",
            bandCombinationSentinel2: "",
            imagerySecureWatchDate: "",
            imagerySecureWatchCloudCover: "",
            imagerySecureWatchAvailableDates: [],
            geeImageryVisParams: "",
            geeImageCollectionStartDate: "",
            geeImageCollectionEndDate: "",
            geeImageCollectionVisParams: "",
            mapConfig: null,
            nextPlotButtonDisabled: false,
            plotList: [],
            prevPlotButtonDisabled: false,
            reviewPlots: false,
            sampleOutlineBlack: true,
            selectedQuestion: { id: 0, question: "", answers: [] },
            selectedSampleId: -1,
            stackingProfileDG: "Accuracy_Profile",
            userSamples: {},
            userImages: {},
            storedInterval: null,
            KMLFeatures: null,
            hasGeoDash: false,
            showSidebar: false,
            loading: false,
            showQuitModal: false,
        };
    }

    componentDidMount() {
        window.name = "_ceocollection";
        this.getProjectData();
    }

    componentDidUpdate(prevProps, prevState) {
        //
        // Initialize after apis return.
        //

        // Wait to get imagery list until project is loaded
        if (this.state.currentProject.institution !== prevState.currentProject.institution) {
            // release any locks in case of user hitting refresh
            fetch(
                this.props.documentRoot
                    + "/release-plot-locks?userId=" + this.props.userId
                    + "&projectId=" + this.state.currentProject.id,
                { method: "POST" }
            );
            this.getImageryList();
        }
        // Initialize map when imagery list is returned
        if (this.state.imageryList.length > 0
            && this.state.currentProject.boundary
            && this.state.mapConfig == null) {
            this.initializeProjectMap();
        }
        // Load all project plots initially
        if (this.state.mapConfig && this.state.plotList.length > 0
            && (this.state.mapConfig !== prevState.mapConfig
                || prevState.plotList.length === 0)) {
            this.showProjectPlots();
        }
        // initialize current imagery to project default
        if (this.state.mapConfig && this.state.currentProject
            && this.state.imageryList.length > 0 && !this.state.currentImagery.id) {
            if (this.getImageryById(this.state.currentProject.imageryId)) {
                this.setBaseMapSource(this.state.currentProject.imageryId);
            } else {
                this.setBaseMapSource(this.state.imageryList[0].id);
            }
        }

        //
        // Update map when state changes
        //

        // Initialize when new plot
        if (this.state.currentPlot && this.state.currentPlot !== prevState.currentPlot) {
            this.showProjectPlot();
            if (this.state.hasGeoDash) this.showGeoDash();
            clearInterval(this.state.storedInterval);
            this.setState({ storedInterval: setInterval(() => this.resetPlotLock, 2.3 * 60 * 1000) });
            if (this.state.currentImagery.sourceConfig.type === "PlanetDaily") this.updatePlanetDailyLayer();
            if (this.state.currentImagery.sourceConfig.type === "SecureWatch") this.getSecureWatchAvailableDates();
        }

        // Conditions required for samples to be shown
        if (this.state.currentPlot
            && this.state.selectedQuestion.visible
            && this.state.selectedQuestion.visible.length > 0) {

            // Changing conditions for which samples need to be re-drawn
            if (this.state.selectedQuestion.id !== prevState.selectedQuestion.id
                || this.state.sampleOutlineBlack !== prevState.sampleOutlineBlack
                || this.state.userSamples !== prevState.userSamples
                || !prevState.selectedQuestion.visible) {
                this.showPlotSamples();
                this.highlightSamplesByQuestion();
                this.createPlotKML();
            }
        }

        // Update user samples calculations for display
        if (this.state.currentProject.surveyQuestions.length > 0
            && this.state.userSamples !== prevState.userSamples) {
            this.updateQuestionStatus();
        }

        //  Update map image stuff
        if (this.state.mapConfig && this.state.currentImagery.id
            && (this.state.currentImagery.id !== prevState.currentImagery.id
                || this.state.mapConfig !== prevState.mapConfig)) {
            this.updateMapImagery();
        }

        if (this.state.imageryMonthPlanet !== prevState.imageryMonthPlanet
            || this.state.imageryYearPlanet !== prevState.imageryYearPlanet) {
            this.updatePlanetLayer();
        }

        if (this.state.imageryStartDatePlanetDaily !== prevState.imageryStartDatePlanetDaily
            || this.state.imageryEndDatePlanetDaily !== prevState.imageryEndDatePlanetDaily) {
            this.updatePlanetDailyLayer();
        }

        if (this.state.imageryMonthSentinel1 !== prevState.imageryMonthSentinel1
            || this.state.imageryYearSentinel1 !== prevState.imageryYearSentinel1
            || this.state.bandCombinationSentinel1 !== prevState.bandCombinationSentinel1) {
            this.updateSentinelLayer("sentinel1");
        }

        if (this.state.imageryMonthSentinel2 !== prevState.imageryMonthSentinel2
            || this.state.imageryYearSentinel2 !== prevState.imageryYearSentinel2
            || this.state.bandCombinationSentinel2 !== prevState.bandCombinationSentinel2) {
            this.updateSentinelLayer("sentinel2");
        }
    }

    getProjectData = () => {
        Promise.all([this.getProjectById(), this.getProjectPlots(), this.checkForGeodash()])
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    getProjectById = () => fetch(this.props.documentRoot + "/get-project-by-id?projectId=" + this.props.projectId)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(project => {
            if (project.id > 0 && project.availability !== "archived") {
                const surveyQuestions = convertSampleValuesToSurveyQuestions(project.sampleValues);
                this.setState({ currentProject: { ...project, surveyQuestions: surveyQuestions }});
                return Promise.resolve("resolved");
            } else {
                return Promise.reject(project.availability === "archived"
                                      ? "This project is archived"
                                      : "No project found with ID " + this.props.projectId + ".");
            }
        });

    checkForGeodash = () => fetch(this.props.documentRoot + "/geo-dash/get-by-projid?projectId=" + this.props.projectId)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            const widgets = Array.isArray(data.widgets)
                ? data.widgets
                : Array.isArray(eval(data.widgets))
                    ? eval(data.widgets)
                    : [];
            this.setState({ hasGeoDash: widgets.length > 0 });
            return Promise.resolve("resolved");
        });

    getProjectPlots = () => fetch(this.props.documentRoot + "/get-project-plots?projectId=" + this.props.projectId + "&max=1000")
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            if (data.length > 0) {
                this.setState({ plotList: data });
                return Promise.resolve("resolved");
            } else {
                return Promise.reject("No plot information found");
            }
        });

    getImageryList = () => {
        const { id } = this.state.currentProject;
        fetch(this.props.documentRoot + "/get-project-imagery?projectId=" + id)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ imageryList: data }))
            .catch(response => {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

    getSecureWatchAvailableDates = () => {
        const { currentImagery } = this.state;
        const geometry = mercator.getViewPolygon(this.state.mapConfig).transform("EPSG:4326", "EPSG:3857");
        const secureWatchFeatureInfoUrl = "SERVICE=WMS"
              + "&VERSION=1.1.1"
              + "&REQUEST=GetFeatureInfo"
              + "&CRS=EPSG%3A3857"
              + "&BBOX=" + geometry.getExtent().join(",")
              + "&WIDTH=256"
              + "&HEIGHT=256"
              + "&LAYERS=DigitalGlobe:ImageryFootprint"
              + "&QUERY_LAYERS=DigitalGlobe:ImageryFootprint"
              + "&FEATURE_COUNT=1000"
              + "&X=0"
              + "&Y=0"
              + "&INFO_FORMAT=application/json"
              + "&imageryId=" + currentImagery.id;
        this.setState(
            { imagerySecureWatchAvailableDates: null },
            () => {
                fetch(this.props.documentRoot + "/get-securewatch-dates?" + secureWatchFeatureInfoUrl)
                    .then(response => {
                        if (response.ok) {
                            return response.json(); // if no layers are found, the response is XML. This will fail.
                        } else {
                            alert("Error retrieving SecureWatch dates. See console for details.");
                            return { features: [] };
                        }
                    })
                    .catch(() => {
                        alert("It is likely that your Connect ID is expired. See console for more details.");
                        return { features: [] };
                    })
                    .then(data => {
                        this.setState({
                            imagerySecureWatchAvailableDates: data.features
                                .filter(feature =>
                                    Date.parse(feature.properties.acquisitionDate) <= Date.parse(currentImagery.sourceConfig.endDate)
                                        && Date.parse(feature.properties.acquisitionDate) >= Date.parse(currentImagery.sourceConfig.startDate)
                                )
                                .map(feature => ({
                                    acquisitionDate: feature.properties.acquisitionDate,
                                    cloudCover: feature.properties.cloudCover,
                                    featureId: feature.properties.featureId,
                                })),
                        }, () => {
                            if (this.state.imagerySecureWatchAvailableDates.length === 0) {
                                this.updateSecureWatchSingleLayer(null, "", "");
                            } else {
                                this.updateSecureWatchSingleLayer(
                                    this.state.imagerySecureWatchAvailableDates[0].featureId,
                                    this.state.imagerySecureWatchAvailableDates[0].acquisitionDate,
                                    this.state.imagerySecureWatchAvailableDates[0].cloudCover,
                                );
                            }
                        });
                    })
                    .catch(response => {
                        console.log(response);
                        alert("Error processing SecureWatch dates. See console for details.");
                    });
            }
        );
    };

    initializeProjectMap = () => {
        const mapConfig = mercator.createMap("image-analysis-pane",
                                             [0.0, 0.0],
                                             1,
                                             this.state.imageryList,
                                             this.props.documentRoot,
                                             this.state.currentProject.boundary);
        mercator.addVectorLayer(mapConfig,
                                "currentAOI",
                                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.currentProject.boundary,
                                                                                      true)),
                                ceoMapStyles.yellowPolygon);
        mercator.zoomMapToLayer(mapConfig, "currentAOI");
        this.setState({ mapConfig: mapConfig });
    };

    showProjectPlots = () => {
        mercator.addPlotLayer(this.state.mapConfig,
                              this.state.plotList,
                              feature => {
                                  this.setState({
                                      prevPlotButtonDisabled: false,
                                  });
                                  this.getPlotData(feature.get("features")[0].get("plotId"));
                              });
    };

    setBaseMapSource = (newBaseMapSource) => {
        const newImagery = this.getImageryById(newBaseMapSource);
        const newImageryAttribution =
            newImagery.sourceConfig.type === "Planet"
                ? newImagery.attribution
                    + " | " + this.state.imageryYearPlanet
                    + "-" + this.state.imageryMonthPlanet
            : newImagery.sourceConfig.type === "PlanetDaily"
                ? newImagery.attribution
                    + " | " + this.state.imageryStartDatePlanetDaily
                    + " to " + this.state.imageryEndDatePlanetDaily
            : newImagery.attribution;
        this.setState({
            currentImagery: newImagery,
            imageryAttribution: newImageryAttribution,
        });
    };

    setImageryYearDG = (newImageryYearDG) => {
        this.setState({
            imageryYearDG: newImageryYearDG,
            imageryAttribution: this.state.currentImagery.attribution
                                + " | " + newImageryYearDG
                                + " (" + this.state.stackingProfileDG + ")",
        });
    };

    setStackingProfileDG = (newStackingProfileDG) => {
        this.setState({
            stackingProfileDG: newStackingProfileDG,
            imageryAttribution: this.state.currentImagery.attribution
                                + " | " + this.state.imageryYearDG
                                + " (" + newStackingProfileDG + ")",
        });
    };

    setImageryYearPlanet = (newImageryYearPlanet) => {
        this.setState({
            imageryYearPlanet: newImageryYearPlanet,
            imageryAttribution: this.state.currentImagery.attribution
                                + " | " + newImageryYearPlanet
                                + "-" + this.state.imageryMonthNamePlanet,
        });
    };

    setImageryDatePlanetDaily = (eventTarget) => {
        const { imageryStartDatePlanetDaily, imageryEndDatePlanetDaily, currentImagery } = this.state;
        const startDate = (eventTarget.id === "planetDailyStartDate") ? eventTarget.value : imageryStartDatePlanetDaily;
        const endDate = (eventTarget.id === "planetDailyEndDate") ? eventTarget.value : imageryEndDatePlanetDaily;
        if (new Date(startDate) > new Date(endDate)) {
            alert("Start date must be smaller than the end date.");
        } else {
            this.setState({
                imageryStartDatePlanetDaily: startDate,
                imageryEndDatePlanetDaily: endDate,
                imageryAttribution: currentImagery.attribution + " | " + startDate + " to " + endDate,
            });
        }
    };

    setImageryMonthPlanet = (newImageryMonthPlanet) => {
        const monthData = {
            1: "January",
            2: "February",
            3: "March",
            4: "April",
            5: "May",
            6: "June",
            7: "July",
            8: "August",
            9:  "September",
            10: "October",
            11: "November",
            12: "December",
        };
        const newImageryMonthName = monthData[parseInt(newImageryMonthPlanet)];
        this.setState({
            imageryMonthPlanet: newImageryMonthPlanet,
            imageryMonthNamePlanet: newImageryMonthName,
            imageryAttribution: this.state.currentImagery.attribution + " | "
                                + this.state.imageryYearPlanet + "-"
                                + newImageryMonthName,
        });
    };

    setImageryYearSentinel = (eventTarget) => {
        const { imageryMonthSentinel1, imageryYearSentinel1, imageryMonthSentinel2, imageryYearSentinel2 } = this.state;

        const newImageryYearSentinel1 = (eventTarget.id === "sentinel1-year") && eventTarget.value ? eventTarget.value : imageryYearSentinel1;
        const newImageryYearSentinel2 = (eventTarget.id === "sentinel2-year") && eventTarget.value ? eventTarget.value : imageryYearSentinel2;

        const startDate = eventTarget.id === "sentinel1-year"
            ? newImageryYearSentinel1 + "-" + (imageryMonthSentinel1 > 9 ? "" : "0") + imageryMonthSentinel1 + "-01"
            : newImageryYearSentinel2 + "-" + (imageryMonthSentinel2 > 9 ? "" : "0") + imageryMonthSentinel2 + "-01";
        const endDate = eventTarget.id === "sentinel1-year"
            ? new Date(newImageryYearSentinel1, imageryMonthSentinel1, 0)
            : new Date(newImageryYearSentinel2, imageryMonthSentinel2, 0);

        this.setState({
            imageryYearSentinel1: newImageryYearSentinel1,
            imageryYearSentinel2: newImageryYearSentinel2,
            imageryAttribution: this.state.currentImagery.attribution + " | " + startDate + " to " + formatDateISO(endDate),
        });
    };

    setImageryMonthSentinel = (eventTarget) => {
        const { imageryMonthSentinel1, imageryYearSentinel1, imageryMonthSentinel2, imageryYearSentinel2 } = this.state;

        const newImageryMonthSentinel1 = (eventTarget.id === "sentinel1-month") && eventTarget.value ? eventTarget.value : imageryMonthSentinel1;
        const newImageryMonthSentinel2 = (eventTarget.id === "sentinel2-month") && eventTarget.value ? eventTarget.value : imageryMonthSentinel2;

        const startDate = eventTarget.id === "sentinel1-month"
            ? imageryYearSentinel1 + "-" + (newImageryMonthSentinel1 > 9 ? "" : "0") + newImageryMonthSentinel1 + "-01"
            : imageryYearSentinel2 + "-" + (newImageryMonthSentinel2 > 9 ? "" : "0") + newImageryMonthSentinel2 + "-01";
        const endDate = eventTarget.id === "sentinel1-month"
            ? new Date(imageryYearSentinel1, newImageryMonthSentinel1, 0)
            : new Date(imageryYearSentinel2, newImageryMonthSentinel2, 0);

        this.setState({
            imageryMonthSentinel1: newImageryMonthSentinel1,
            imageryMonthSentinel2: newImageryMonthSentinel2,
            imageryAttribution: this.state.currentImagery.attribution + " | " + startDate + " to " + formatDateISO(endDate),
        });
    };

    setBandCombinationSentinel = (eventTarget) => {
        const { bandCombinationSentinel1, bandCombinationSentinel2 } = this.state;
        this.setState({
            bandCombinationSentinel1: (eventTarget.id === "sentinel1-bandCombination") && eventTarget.value ? eventTarget.value : bandCombinationSentinel1,
            bandCombinationSentinel2: (eventTarget.id === "sentinel2-bandCombination") && eventTarget.value ? eventTarget.value : bandCombinationSentinel2,
        });
    };

    setGEEImageryVisParams = (newVisParams) => this.setState({ geeImageryVisParams: newVisParams });

    setGEEImageCollectionVisParams = (newVisParams) => this.setState({ geeImageCollectionVisParams: newVisParams });

    setGEEImageCollectionStartDate = (newDate) => this.setState({ geeImageCollectionStartDate: newDate });

    setGEEImageCollectionEndDate = (newDate) => this.setState({ geeImageCollectionEndDate: newDate });

    updateMapImagery = () => {
        mercator.setVisibleLayer(this.state.mapConfig, this.state.currentImagery.id);

        if (this.state.currentImagery.sourceConfig.type === "PlanetDaily") {
            const startDate = this.state.currentImagery.sourceConfig.startDate || "2019-01-01";
            const endDate = this.state.currentImagery.sourceConfig.endDate || "2019-02-01";
            this.setState({
                imageryStartDatePlanetDaily: startDate,
                imageryEndDatePlanetDaily: endDate,
                imageryAttribution: this.state.currentImagery.attribution + " | " + startDate + " to " + endDate,
            });
        } else {
            mercator.currentMap.getControls().getArray().filter(control => control.element.classList.contains("planet-layer-switcher"))
                .map(control => mercator.currentMap.removeControl(control));
            this.setState({
                imageryStartDatePlanetDaily: "",
                imageryEndDatePlanetDaily: "",
            });
            if (this.state.currentImagery.sourceConfig.type === "Planet") {
                this.updatePlanetLayer();
            } else if (this.state.currentImagery.sourceConfig.type === "SecureWatch") {
                this.getSecureWatchAvailableDates();
            } else if (this.state.currentImagery.sourceConfig.type === "Sentinel1"
                || this.state.currentImagery.sourceConfig.type === "Sentinel2") {
                const month = parseInt(this.state.currentImagery.sourceConfig.month) || 1;
                const year = parseInt(this.state.currentImagery.sourceConfig.year) || 2018;
                const bandCombination = this.state.currentImagery.sourceConfig.bandCombination ||
                    (this.state.currentImagery.sourceConfig.type === "Sentinel1" ? "VH,VV,VH/VV" : "TrueColor");
                const startDate = year + "-" + (month > 9 ? "" : "0") + month + "-01";
                const endDate = new Date(year, month, 0);

                this.setState({
                    [this.state.currentImagery.sourceConfig.type === "Sentinel1" ? "imageryYearSentinel1" : "imageryYearSentinel2"] : year,
                    [this.state.currentImagery.sourceConfig.type === "Sentinel1" ? "imageryMonthSentinel1" : "imageryMonthSentinel2"] : month,
                    [this.state.currentImagery.sourceConfig.type === "Sentinel1" ? "bandCombinationSentinel1" : "bandCombinationSentinel2"] : bandCombination,
                    "imageryAttribution" : this.state.currentImagery.attribution + " | " + startDate + " to " + formatDateISO(endDate),
                });
            } else if (this.state.currentImagery.sourceConfig.type === "GEEImage") {
                this.setState({ geeImageryVisParams: this.state.currentImagery.sourceConfig.imageVisParams });
            } else if (this.state.currentImagery.sourceConfig.type === "GEEImageCollection") {
                this.setState({
                    geeImageCollectionVisParams: this.state.currentImagery.sourceConfig.collectionVisParams,
                    geeImageCollectionStartDate: this.state.currentImagery.sourceConfig.startDate,
                    geeImageCollectionEndDate: this.state.currentImagery.sourceConfig.endDate,
                });
            }
        }
    };

    getImageryById = (imageryId) => this.state.imageryList.find(imagery => imagery.id === imageryId);

    updatePlanetLayer = () => {
        const { currentImagery, imageryMonthPlanet, imageryYearPlanet } = this.state;
        mercator.updateLayerSource(this.state.mapConfig,
                                   currentImagery.id,
                                   this.state.currentProject.boundary,
                                   sourceConfig => ({
                                       ...sourceConfig,
                                       month: imageryMonthPlanet < 10 ? "0" + imageryMonthPlanet : imageryMonthPlanet,
                                       year: imageryYearPlanet,
                                   }),
                                   this);
    };

    removeAndAddVector = () => {
        const { mapConfig, currentPlot, currentProject, selectedQuestion: { visible }} = this.state;
        mercator.removeLayerById(mapConfig, "currentAOI");
        mercator.addVectorLayer(mapConfig,
                                "currentAOI",
                                mercator.geometryToVectorSource(mercator.parseGeoJson(currentProject.boundary, true)),
                                ceoMapStyles.yellowPolygon);
        mercator.removeLayerById(mapConfig, "currentPlot");
        mercator.addVectorLayer(mapConfig,
                                "currentPlot",
                                mercator.geometryToVectorSource(
                                    currentPlot.geom
                                        ? mercator.parseGeoJson(currentPlot.geom, true)
                                        : mercator.getPlotPolygon(currentPlot.center,
                                                                  currentProject.plotSize,
                                                                  currentProject.plotShape)
                                ),
                                ceoMapStyles.yellowPolygon);
        mercator.removeLayerById(mapConfig, "currentSamples");
        mercator.addVectorLayer(mapConfig,
                                "currentSamples",
                                mercator.samplesToVectorSource(visible),
                                this.state.sampleOutlineBlack
                                ? visible[0].geom
                                    ? ceoMapStyles.blackPolygon
                                    : ceoMapStyles.blackCircle
                                : visible[0].geom
                                    ? ceoMapStyles.whitePolygon
                                    : ceoMapStyles.whiteCircle);
        this.highlightSamplesByQuestion();
        this.setState({ loading: false });
    };

    updatePlanetDailyLayer = () => {
        this.setState({ loading: this.state.currentImagery.sourceConfig.type === "PlanetDaily" });
        mercator.currentMap.getControls().getArray().filter(control => control.element.classList.contains("planet-layer-switcher"))
            .map(control => mercator.currentMap.removeControl(control));
        const { imageryStartDatePlanetDaily, imageryEndDatePlanetDaily, currentPlot } = this.state;
        // check so that the function is not called before the state is propagated
        if (imageryStartDatePlanetDaily && imageryEndDatePlanetDaily && currentPlot) {
            mercator.updateLayerSource(this.state.mapConfig,
                                       this.state.currentImagery.id,
                                       mercator.geometryToGeoJSON(
                                           mercator.getViewPolygon(this.state.mapConfig),
                                           "EPSG:4326"
                                       ),
                                       sourceConfig => ({
                                           ...sourceConfig,
                                           startDate: imageryStartDatePlanetDaily,
                                           endDate: imageryEndDatePlanetDaily,
                                       }),
                                       this,
                                       this.removeAndAddVector);
        }
    };

    updateSentinelLayer = (type) => {
        const {
            currentImagery, imageryMonthSentinel2, imageryYearSentinel2, bandCombinationSentinel2,
            imageryMonthSentinel1, imageryYearSentinel1, bandCombinationSentinel1,
        } = this.state;
        mercator.updateLayerSource(this.state.mapConfig,
                                   currentImagery.id,
                                   this.state.currentProject.boundary,
                                   sourceConfig => ({
                                       ...sourceConfig,
                                       month: (type === "sentinel1")
                                           ? imageryMonthSentinel1.toString()
                                           : imageryMonthSentinel2.toString(),
                                       year: (type === "sentinel1")
                                           ? imageryYearSentinel1.toString()
                                           : imageryYearSentinel2.toString(),
                                       bandCombination: (type === "sentinel1")
                                           ? bandCombinationSentinel1
                                           : bandCombinationSentinel2,
                                   }),
                                   this);
    };

    updateSecureWatchSingleLayer = (featureId, imagerySecureWatchDate, imagerySecureWatchCloudCover) => {
        mercator.updateLayerWmsParams(this.state.mapConfig, this.state.currentImagery.id, {
            COVERAGE_CQL_FILTER: "featureId='" + featureId + "'",
        });
        this.setState({
            imagerySecureWatchDate: imagerySecureWatchDate,
            imagerySecureWatchCloudCover: imagerySecureWatchCloudCover,
            imageryAttribution: this.state.currentImagery.attribution
                + (featureId
                    ? " | " + imagerySecureWatchDate
                        + " (" + (imagerySecureWatchCloudCover * 100).toFixed(2) + "% cloudy)"
                    : " | No available layers"),
        });
    }

    onChangeSecureWatchSingleLayer = (eventTarget) =>
        this.updateSecureWatchSingleLayer(
            eventTarget.value,
            eventTarget.options[eventTarget.selectedIndex].getAttribute("date"),
            eventTarget.options[eventTarget.options.selectedIndex].getAttribute("cloud")
        );

    updateGEEImagery = () =>
        mercator.updateLayerSource(
            this.state.mapConfig,
            this.state.currentImagery.id,
            this.state.currentProject.boundary,
            sourceConfig => ({
                ...sourceConfig,
                imageVisParams: this.state.geeImageryVisParams,
            }),
            this
        );

    updateGEEImageCollection = () =>{
        const { geeImageCollectionStartDate, geeImageCollectionEndDate } = this.state;
        if (new Date(geeImageCollectionStartDate) > new Date(geeImageCollectionEndDate)) {
            alert("Start date must be smaller than the end date.");
        } else {
            mercator.updateLayerSource(
                this.state.mapConfig,
                this.state.currentImagery.id,
                this.state.currentProject.boundary,
                sourceConfig => ({
                    ...sourceConfig,
                    collectionVisParams: this.state.geeImageCollectionVisParams,
                    startDate: this.state.geeImageCollectionStartDate,
                    endDate: this.state.geeImageCollectionEndDate,
                }),
                this
            );
        }
    };

    plotHasSamples = (plotData) => {
        if (plotData.samples.length === 0) {
            alert("This plot has no samples. Please flag the plot.");
            return false;
        } else {
            return true;
        }
    };

    getPlotData = (plotId) => {
        fetch(this.props.documentRoot + "/get-plot-by-id?"
              + getQueryString({
                  getUserPlots: this.state.reviewPlots,
                  plotId: plotId,
                  projectId: this.props.projectId,
                  userId: this.props.userId,
                  userName: this.props.userName,
              }))
            .then(response => response.ok ? response.text() : Promise.reject(response))
            .then(data => {
                if (data === "done") {
                    alert(this.state.reviewPlots
                          ? "This plot was analyzed by someone else. You are logged in as " + this.props.userName + "."
                          : "This plot has already been analyzed.");
                } else if (data === "not found") {
                    alert("Plot " + plotId + " not found.");
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.newPlotValues(newPlot),
                        prevPlotButtonDisabled: false,
                        nextPlotButtonDisabled: false,
                    });
                    this.plotHasSamples(newPlot);
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    getNextPlotData = (plotId) => {
        fetch(this.props.documentRoot + "/get-next-plot?"
              + getQueryString({
                  getUserPlots: this.state.reviewPlots,
                  plotId: plotId,
                  projectId: this.props.projectId,
                  institutionId: this.state.currentProject.institution,
                  userId: this.props.userId,
                  userName: this.props.userName,
              }))
            .then(response => response.ok ? response.text() : Promise.reject(response))
            .then(data => {
                if (data === "done") {
                    if (plotId === -1) {
                        alert(this.state.reviewPlots
                              ? "You have not reviewed any plots. You are logged in as " + this.props.userName + "."
                              : "All plots have been analyzed for this project.");
                    } else {
                        this.setState({ nextPlotButtonDisabled: true });
                        alert("You have reached the end of the plot list.");
                    }
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.newPlotValues(newPlot),
                        prevPlotButtonDisabled: plotId === -1,
                    });
                    this.plotHasSamples(newPlot);
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    getPrevPlotData = (plotId) => {
        fetch(this.props.documentRoot + "/get-prev-plot?"
              + getQueryString({
                  getUserPlots: this.state.reviewPlots,
                  plotId: plotId,
                  projectId: this.props.projectId,
                  institutionId: this.state.currentProject.institution,
                  userId: this.props.userId,
                  userName: this.props.userName,
              }))
            .then(response => response.ok ? response.text() : Promise.reject(response))
            .then(data => {
                if (data === "done") {
                    this.setState({ prevPlotButtonDisabled: true });
                    alert(this.state.reviewPlots
                          ? "No previous plots were analyzed by you. You are logged in as " + this.props.userName + "."
                          : "All previous plots have been analyzed.");
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.newPlotValues(newPlot),
                        nextPlotButtonDisabled: false,
                    });
                    this.plotHasSamples(newPlot);
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    resetPlotLock = () => {
        fetch(this.props.documentRoot + "/reset-plot-lock",
              {
                  method: "POST",
                  body: JSON.stringify({
                      plotId: this.state.currentPlot.id,
                      projectId: this.props.projectId,
                      userId: this.props.userId,
                      userName: this.props.userName,
                  }),
              })
            .then(response => {
                if (!response.ok) {
                    console.log(response);
                    alert("Error maintaining plot lock. Your work may get overwritten. See console for details.");
                }
            });
    };

    resetPlotValues = (newPlot) => this.setState(this.newPlotValues(newPlot));

    newPlotValues = (newPlot) => ({
        newPlotInput: newPlot.plotId ? newPlot.plotId : newPlot.id,
        userSamples: newPlot.samples
            ? newPlot.samples.reduce((obj, s) => {
                obj[s.id] = s.value || {};
                return obj;
            }, {})
            : {},
        userImages: newPlot.samples
            ? newPlot.samples.reduce((obj, s) => {
                obj[s.id] = s.userImage || {};
                return obj;
            }, {})
            : {},
        selectedQuestion: {
            ...this.state.currentProject.surveyQuestions
                .sort((a, b) => a.id - b.id)
                .find(surveyNode => surveyNode.parentQuestion === -1),
            visible: null,
        },
        collectionStart: Date.now(),
        sampleOutlineBlack: true,
    });

    showProjectPlot = () => {
        const { currentPlot, mapConfig, currentProject } = this.state;

        mercator.disableSelection(mapConfig);
        mercator.removeLayerById(mapConfig, "currentPlots");
        mercator.removeLayerById(mapConfig, "currentPlot");
        mercator.removeLayerById(mapConfig, "currentSamples");

        mercator.addVectorLayer(mapConfig,
                                "currentPlot",
                                mercator.geometryToVectorSource(
                                    currentPlot.geom
                                        ? mercator.parseGeoJson(currentPlot.geom, true)
                                        : mercator.getPlotPolygon(currentPlot.center,
                                                                  currentProject.plotSize,
                                                                  currentProject.plotShape)
                                ),
                                ceoMapStyles.yellowPolygon);

        mercator.zoomMapToLayer(mapConfig, "currentPlot");
    };

    showPlotSamples = () => {
        const { mapConfig, selectedQuestion: { visible }} = this.state;
        mercator.disableSelection(mapConfig);
        mercator.removeLayerById(mapConfig, "currentSamples");
        mercator.addVectorLayer(mapConfig,
                                "currentSamples",
                                mercator.samplesToVectorSource(visible),
                                this.state.sampleOutlineBlack
                                ? visible[0].geom
                                    ? ceoMapStyles.blackPolygon
                                    : ceoMapStyles.blackCircle
                                : visible[0].geom
                                    ? ceoMapStyles.whitePolygon
                                    : ceoMapStyles.whiteCircle);
        mercator.enableSelection(mapConfig,
                                 "currentSamples",
                                 (sampleId) => this.setState({ selectedSampleId: sampleId }));
    };

    showGeoDash = () => {
        const { currentPlot, mapConfig, currentProject } = this.state;
        const plotRadius = currentProject.plotSize
              ? currentProject.plotSize / 2.0
              : mercator.getViewRadius(mapConfig);
        window.open(this.props.documentRoot + "/geo-dash?"
                    + "institutionId=" + this.state.currentProject.institution
                    + "&projectId=" + this.props.projectId
                    + "&plotId=" + (currentPlot.plotId ? currentPlot.plotId : currentPlot.id)
                    + "&plotShape=" + encodeURIComponent((currentPlot.geom ? "polygon" : currentProject.plotShape))
                    + "&aoi=" + encodeURIComponent("[" + mercator.getViewExtent(mapConfig) + "]")
                    + "&daterange=&bcenter=" + currentPlot.center
                    + "&bradius=" + plotRadius,
                    "_geo-dash");
    };

    createPlotKML = () => {
        const plotFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentPlot");
        const sampleFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples");
        this.setState({
            KMLFeatures: mercator.getKMLFromFeatures([mercator.asPolygonFeature(plotFeatures[0]),
                                                      ...sampleFeatures]),
        });
    };

    goToFirstPlot = () => this.getNextPlotData(-1);

    prevPlot = () => this.getPrevPlotData(this.state.currentPlot.plotId
                                          ? parseInt(this.state.currentPlot.plotId)
                                          : this.state.currentPlot.id);

    nextPlot = () => this.getNextPlotData(this.state.currentPlot.plotId
                                          ? parseInt(this.state.currentPlot.plotId)
                                          : this.state.currentPlot.id);

    goToPlot = (newPlot) => {
        if (!isNaN(newPlot)) {
            this.getPlotData(newPlot);
        } else {
            alert("Please enter a number to go to plot.");
        }
    };

    setReviewPlots = () => this.setState({
        reviewPlots: !this.state.reviewPlots,
        prevPlotButtonDisabled: false,
        nextPlotButtonDisabled: false,
    });

    flagPlotInDB = () => {
        if (this.state.currentPlot != null) {
            fetch(this.props.documentRoot + "/flag-plot",
                  {
                      method: "POST",
                      body: JSON.stringify({
                          projectId: this.props.projectId,
                          plotId: this.state.currentPlot.id,
                          userId: this.props.userId,
                          userName: this.props.userName,
                      }),
                  })
                .then(response => {
                    if (response.ok) {
                        this.nextPlot();
                    } else {
                        console.log(response);
                        alert("Error flagging plot as bad. See console for details.");
                    }
                });
        }
    };

    postValuesToDB = () => {
        if (this.state.currentProject.availability === "unpublished") {
            alert("Please publish the project before starting the survey.");
        } else if (this.state.currentProject.availability === "closed") {
            alert("This project has been closed and is no longer accepting survey input.");
        } else {
            fetch(this.props.documentRoot + "/add-user-samples",
                  {
                      method: "post",
                      headers: {
                          "Accept": "application/json",
                          "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                          projectId: this.props.projectId,
                          plotId: this.state.currentPlot.id,
                          userName: this.props.userName,
                          userId: this.props.userId,
                          confidence: -1,
                          collectionStart: this.state.collectionStart,
                          userSamples: this.state.userSamples,
                          userImages: this.state.userImages,
                      }),
                  })
                .then(response => {
                    if (response.ok) {
                        this.nextPlot();
                    } else {
                        console.log(response);
                        alert("Error saving your assignments to the database. See console for details.");
                    }
                });
        }
    };

    getImageryAttributes = () =>
        (this.state.currentImagery.sourceConfig.type === "Planet") ? {
            imageryMonthPlanet: this.state.imageryMonthPlanet,
            imageryYearPlanet:  this.state.imageryYearPlanet,
        } : (this.state.currentImagery.sourceConfig.type === "PlanetDaily") ? {
            imageryStartDatePlanetDaily: this.state.imageryStartDatePlanetDaily,
            imageryEndDatePlanetDaily: this.state.imageryEndDatePlanetDaily,
            imageryDatePlanetDaily: mercator.getTopVisiblePlanetLayerDate(this.state.mapConfig, this.state.currentImagery.id),
        } : (this.state.currentImagery.sourceConfig.type === "SecureWatch") ? {
            imagerySecureWatchDate: this.state.imagerySecureWatchDate || "",
            imagerySecureWatchCloudCover: this.state.imagerySecureWatchCloudCover ? (parseFloat(this.state.imagerySecureWatchCloudCover) * 100).toFixed(2) : "",
        } : (this.state.currentImagery.sourceConfig.type === "Sentinel1") ? {
            sentinel1MosaicYearMonth: this.state.imageryYearSentinel1 + " - " +
                (this.state.imageryYearSentinel1 > 9 ? "" : "0") + this.state.imageryYearSentinel1,
        } : (this.state.currentImagery.sourceConfig.type === "Sentinel2") ? {
            sentinel2MosaicYearMonth: this.state.imageryYearSentinel2 + " - " +
                (this.state.imageryYearSentinel2 > 9 ? "" : "0") + this.state.imageryYearSentinel2,
        } : {};

    getChildQuestions = (currentQuestionId) => {
        const { surveyQuestions } = this.state.currentProject;
        const { question, id } = surveyQuestions.find(sq => sq.id === currentQuestionId);
        const childQuestions = surveyQuestions.filter(sq => sq.parentQuestion === id);

        if (childQuestions.length === 0) {
            return [question];
        } else {
            return childQuestions
                .reduce((prev, acc) => (
                    [...prev, ...this.getChildQuestions(acc.id)]
                ), [question]);
        }
    };

    intersection = (array1, array2) => array1.filter(value => array2.includes(value));

    getSelectedSampleIds = (question) => {
        const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples") || [];
        const selectedFeatures = mercator.getSelectedSamples(this.state.mapConfig) ? mercator.getSelectedSamples(this.state.mapConfig).getArray() : [];

        return (
            (selectedFeatures.length === 0 && question.answered.length === 0)
            || Object.keys(this.state.userSamples).length === 1
                    ? allFeatures
                    : selectedFeatures
        ).map(sf => sf.get("sampleId"));
    };

    checkRuleTextMatch = (surveyRule, questionToSet, answerId, answerText) => {
        if (surveyRule.questionId === questionToSet.id &&
            !RegExp(surveyRule.regex).test(answerText)) {
            return "Text match validation failed: Please enter a regular expression that matches " + surveyRule.regex;
        } else {
            return null;
        }
    };

    checkRuleNumericRange = (surveyRule, questionToSet, answerId, answerText) => {
        if (surveyRule.questionId === questionToSet.id &&
            (isNaN(parseInt(answerText)) ||
             parseInt(answerText) < surveyRule.min ||
             parseInt(answerText) > surveyRule.max)) {
            return "Numeric range validation failed: Please select a value between " + surveyRule.min + " and " + surveyRule.max;
        } else {
            return null;
        }
    };

    checkRuleSumOfAnswers = (surveyRule, questionToSet, answerId, answerText) => {
        if (surveyRule.questions.includes(questionToSet.id)) {
            const answeredQuestions = this.state.currentProject.surveyQuestions
                .filter(q => surveyRule.questions.includes(q.id) && q.answered.length > 0 && q.id !== questionToSet.id);
            if (surveyRule.questions.length === answeredQuestions.length + 1) {
                const sampleIds = this.getSelectedSampleIds(questionToSet);
                const answeredSampleIds = answeredQuestions.map(q => q.answered.map(a => a.sampleId));
                const commonSampleIds = answeredSampleIds.reduce(this.intersection, sampleIds);
                if (commonSampleIds.length > 0) {
                    return commonSampleIds.map(sampleId => {
                        const answeredSum = answeredQuestions
                            .map(q => q.answered.find(ques => ques.sampleId === sampleId).answerText)
                            .reduce((sum, num) => sum + parseInt(num), 0);
                        if (answeredSum + parseInt(answerText) !== surveyRule.validSum) {
                            return "Sum of answers validation failed: Possible sum for questions ["
                                + surveyRule.questionsText.toString()
                                + "] is "
                                + (surveyRule.validSum - answeredSum).toString()
                                + ".";
                        } else {
                            return null;
                        }
                    }).find(res => res !== null);
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else {
            return null;
        }
    };

    checkRuleMatchingSums = (surveyRule, questionToSet, answerId, answerText) => {
        if (surveyRule.questionSetIds1.includes(questionToSet.id) || surveyRule.questionSetIds2.includes(questionToSet.id)) {
            const answeredQuestions1 = this.state.currentProject.surveyQuestions
                .filter(q => surveyRule.questionSetIds1.includes(q.id) && q.answered.length > 0 && q.id !== questionToSet.id);
            const answeredQuestions2 = this.state.currentProject.surveyQuestions
                .filter(q => surveyRule.questionSetIds2.includes(q.id) && q.answered.length > 0 && q.id !== questionToSet.id);
            if (surveyRule.questionSetIds1.length + surveyRule.questionSetIds2.length === answeredQuestions1.length + answeredQuestions2.length + 1) {
                const sampleIds = this.getSelectedSampleIds(questionToSet);
                const answeredSampleIds1 = answeredQuestions1.map(q => q.answered.map(a => a.sampleId));
                const commonSampleIds1 = answeredSampleIds1.reduce(this.intersection, sampleIds);
                const answeredSampleIds2 = answeredQuestions2.map(q => q.answered.map(a => a.sampleId));
                const commonSampleIds2 = answeredSampleIds2.reduce(this.intersection, sampleIds);
                const commonSampleIds = this.intersection(commonSampleIds1, commonSampleIds2);
                if (commonSampleIds.length > 0) {
                    const sampleSums = commonSampleIds.map(sampleId => {
                        const sum1 = answeredQuestions1
                            .map(q => q.answered.find(a => a.sampleId === sampleId).answerText)
                            .reduce((sum, num) => sum + parseInt(num), 0);
                        const sum2 = answeredQuestions2
                            .map(q => q.answered.find(a => a.sampleId === sampleId).answerText)
                            .reduce((sum, num) => sum + parseInt(num), 0);
                        return [sum1, sum2];
                    });
                    const invalidSum = sampleSums.find(sums =>
                        sums[0] + (surveyRule.questionSetIds1.includes(questionToSet.id) ? parseInt(answerText) : 0)
                        !== sums[1] + (surveyRule.questionSetIds2.includes(questionToSet.id) ? parseInt(answerText) : 0)
                    );
                    if (invalidSum) {
                        return "Matching sums validation failed: Totals of the question sets ["
                                + surveyRule.questionSetText1.toString()
                                + "] and ["
                                + surveyRule.questionSetText2.toString()
                                + "] do not match.\n\nValid total is "
                                + Math.abs(invalidSum[0] - invalidSum[1])
                                + ".";
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else {
            return null;
        }
    };

    checkRuleIncompatibleAnswers = (surveyRule, questionToSet, answerId, answerText) => {
        if (surveyRule.question1 === questionToSet.id && surveyRule.answer1 === answerId) {
            const ques2 = this.state.currentProject.surveyQuestions.find(q => q.id === surveyRule.question2);
            if (ques2.answered.some(ans => ans.answerId === surveyRule.answer2)) {
                const ques1Ids = this.getSelectedSampleIds(questionToSet);
                const ques2Ids = ques2.answered.filter(ans => ans.answerId === surveyRule.answer2).map(a => a.sampleId);
                const commonSampleIds = this.intersection(ques1Ids, ques2Ids);
                if (commonSampleIds.length > 0) {
                    return "Incompatible answer";
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else if (surveyRule.question2 === questionToSet.id && surveyRule.answer2 === answerId) {
            const ques1 = this.state.currentProject.surveyQuestions.find(q => q.id === surveyRule.question1);
            if (ques1.answered.some(ans => ans.answerId === surveyRule.answer1)) {
                const ques2Ids = this.getSelectedSampleIds(questionToSet);
                const ques1Ids = ques1.answered.filter(ans => ans.answerId === surveyRule.answer1).map(a => a.sampleId);
                const commonSampleIds = this.intersection(ques1Ids, ques2Ids);
                if (commonSampleIds.length > 0) {
                    return "Incompatible answer";
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else {
            return null;
        }
    };

    ruleFunctions = {
        "text-match":           this.checkRuleTextMatch,
        "numeric-range":        this.checkRuleNumericRange,
        "sum-of-answers":       this.checkRuleSumOfAnswers,
        "matching-sums":        this.checkRuleMatchingSums,
        "incompatible-answers": this.checkRuleIncompatibleAnswers,
    };

    rulesViolated = (questionToSet, answerId, answerText) =>
        this.state.currentProject.surveyRules
        && this.state.currentProject.surveyRules
            .map(surveyRule => this.ruleFunctions[surveyRule.ruleType](surveyRule, questionToSet, answerId, answerText))
            .find(msg => msg);

    checkSelection = (sampleIds, ruleError, questionToSet) => {
        if (!this.plotHasSamples(this.state.currentPlot)) {
            return false;
        } else if (sampleIds.some(sid => questionToSet.visible.every(vs => vs.id !== sid))) {
            alert("Invalid Selection. Try selecting the question before answering.");
            return false;
        } else if (sampleIds.length === 0) {
            alert("You must make a selection after some samples have been answered.");
            return false;
        } else if (ruleError) {
            alert(ruleError);
            return false;
        } else {
            return true;
        }
    };

    setCurrentValue = (questionToSet, answerId, answerText) => {
        const sampleIds = this.getSelectedSampleIds(questionToSet);
        const ruleError = this.rulesViolated(questionToSet, answerId, answerText);

        if (this.checkSelection(sampleIds, ruleError, questionToSet)) {
            const newSamples = sampleIds.reduce((acc, sampleId) => {
                const newQuestion = {
                    questionId: questionToSet.id,
                    answer: answerText,
                    answerId: answerId,
                };

                const childQuestionArray = this.getChildQuestions(questionToSet.id);
                const clearedSubQuestions = Object.entries(this.state.userSamples[sampleId])
                    .filter(entry => !childQuestionArray.includes(entry[0]))
                    .reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {});

                return {
                    ...acc,
                    [sampleId]: {
                        ...clearedSubQuestions,
                        [questionToSet.question]: newQuestion,
                    },
                };

            }, {});

            const newUserImages = sampleIds
                .reduce((acc, sampleId) => ({
                    ...acc,
                    [sampleId]: {
                        id: this.state.currentImagery.id,
                        attributes: this.getImageryAttributes(),
                    },
                }), {});

            this.setState({
                userSamples: { ...this.state.userSamples, ...newSamples },
                userImages: { ...this.state.userImages, ...newUserImages },
                selectedQuestion: questionToSet,
            });
        }
    };

    setSelectedQuestion = (newSelectedQuestion) => this.setState({ selectedQuestion: newSelectedQuestion });

    invertColor(hex) {
        const deHashed = hex.indexOf("#") === 0 ? hex.slice(1) : hex;
        const hexFormatted = deHashed.length === 3
              ? deHashed[0] + deHashed[0] + deHashed[1] + deHashed[1] + deHashed[2] + deHashed[2]
              : deHashed;

        // invert color components
        const r = (255 - parseInt(hexFormatted.slice(0, 2), 16)).toString(16);
        const g = (255 - parseInt(hexFormatted.slice(2, 4), 16)).toString(16);
        const b = (255 - parseInt(hexFormatted.slice(4, 6), 16)).toString(16);
        // pad each with zeros and return
        const padZero = (str) => (new Array(2).join("0") + str).slice(-2);
        return "#" + padZero(r) + padZero(g) + padZero(b);
    }

    highlightSamplesByQuestion = () => {
        const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples") || [];

        const { question } = this.state.selectedQuestion;
        allFeatures
            .filter(feature => {
                const sampleId = feature.get("sampleId");
                return this.state.userSamples[sampleId]
                    && this.state.userSamples[sampleId][question];
            })
            .forEach(feature => {
                const sampleId = feature.get("sampleId");
                const userAnswer = this.state.userSamples[sampleId][question].answer;
                const matchingAnswer = this.state.selectedQuestion.answers
                    .find(ans => ans.answer === userAnswer);

                const color = this.state.selectedQuestion.componentType === "input"
                      ? userAnswer.length > 0
                          ? this.state.selectedQuestion.answers[0].color
                          : this.invertColor(this.state.selectedQuestion.answers[0].color)
                      : matchingAnswer
                          ? matchingAnswer.color
                          : "";

                mercator.highlightSampleGeometry(feature, color);
            });
    };

    calcVisibleSamples = (currentQuestionId) => {
        const { currentProject : { surveyQuestions }, userSamples } = this.state;
        const { parentQuestion, parentAnswer } = surveyQuestions.find(sq => sq.id === currentQuestionId);
        const parentQuestionText = parentQuestion === -1
              ? ""
              : surveyQuestions.find(sq => sq.id === parentQuestion).question;

        if (parentQuestion === -1) {
            return this.state.currentPlot.samples;
        } else {
            const correctAnswerText = surveyQuestions
                .find(sq => sq.id === parentQuestion).answers
                .find(ans => parentAnswer === -1 || ans.id === parentAnswer).answer;

            return this.calcVisibleSamples(parentQuestion)
                .filter(sample => {
                    const sampleAnswer = userSamples[sample.id][parentQuestionText]
                          && userSamples[sample.id][parentQuestionText].answer;
                    return (parentAnswer === -1 && sampleAnswer) || correctAnswerText === sampleAnswer;
                });
        }
    };

    updateQuestionStatus = () => {
        const newSurveyQuestions = this.state.currentProject.surveyQuestions.map(sq => {
            const visibleSamples = this.calcVisibleSamples(sq.id);
            return ({
                ...sq,
                visible: visibleSamples,
                answered: visibleSamples
                    .filter(vs => this.state.userSamples[vs.id][sq.question])
                    .map(vs => ({
                        sampleId: vs.id,
                        answerId: this.state.userSamples[vs.id][sq.question].answerId,
                        answerText: this.state.userSamples[vs.id][sq.question].answer,
                    })),
            });
        });

        this.setState({
            currentProject: {
                ...this.state.currentProject,
                surveyQuestions: newSurveyQuestions,
            },
            selectedQuestion: newSurveyQuestions.find(sq => sq.id === this.state.selectedQuestion.id),
        });
    };

    unansweredColor = () => (
        <div className="PlotNavigation__change-color row justify-content-center">
            Unanswered Color
            <div className="form-check form-check-inline">
                <input
                    className="form-check-input ml-2"
                    checked={this.state.sampleOutlineBlack}
                    id="radio1"
                    onChange={() => this.setState({ sampleOutlineBlack: true })}
                    type="radio"
                    name="color-radios"
                />
                <label htmlFor="radio1" className="form-check-label">Black</label>
            </div>
            <div className="form-check form-check-inline">
                <input
                    className="form-check-input"
                    checked={!this.state.sampleOutlineBlack}
                    id="radio2"
                    onChange={() => this.setState({ sampleOutlineBlack: false })}
                    type="radio"
                    name="color-radios"
                />
                <label htmlFor="radio2" className="form-check-label">White</label>
            </div>
        </div>
    );

    toggleShowSidebar = () => {
        this.setState(prevState => ({
            showSidebar: !prevState.showSidebar,
        }), () => {
            window.location = this.state.showSidebar ? "#sidebar" : "#image-analysis-pane";
        });
    };

    toggleQuitModal = () => this.setState({ showQuitModal: !this.state.showQuitModal });

    render() {
        const plotId = this.state.currentPlot
              && (this.state.currentPlot.plotId ? this.state.currentPlot.plotId : this.state.currentPlot.id);
        return (
            <div className="row" style={{ height: "-webkit-fill-available" }}>
                <ImageAnalysisPane
                    imageryAttribution={this.state.imageryAttribution}
                    projectId={this.props.projectId}
                    plotId={plotId}
                    KMLFeatures={this.state.KMLFeatures}
                    loader={this.state.loading}
                />
                <div
                    onClick={this.toggleShowSidebar}
                    className="d-xl-none btn bg-lightgreen"
                    style={{ position: "absolute", zIndex: 99999, right: "2rem", lineHeight: "1rem" }}
                >
                    <div style={{ padding: ".5rem", color: "white" }}>
                        {this.state.showSidebar ? <UnicodeIcon icon="upCaret"/> : <UnicodeIcon icon="downCaret"/>}
                    </div>
                </div>
                <SideBar
                    projectId={this.props.projectId}
                    plotId={plotId}
                    documentRoot={this.props.documentRoot}
                    flagPlotInDB={this.flagPlotInDB}
                    postValuesToDB={this.postValuesToDB}
                    projectName={this.state.currentProject.name}
                    clearAnswers={() => this.resetPlotValues(this.state.currentPlot)}
                    surveyQuestions={this.state.currentProject.surveyQuestions}
                    userName={this.props.userName}
                    isFlagged={this.state.currentPlot && this.state.currentPlot.flagged}
                    isAnalyzed={this.state.currentPlot && this.state.currentPlot.analyses > 0}
                    toggleQuitModal={this.toggleQuitModal}
                >
                    <PlotNavigation
                        plotId={plotId}
                        projectId={this.props.projectId}
                        navButtonsShown={this.state.currentPlot != null}
                        nextPlotButtonDisabled={this.state.nextPlotButtonDisabled}
                        prevPlotButtonDisabled={this.state.prevPlotButtonDisabled}
                        reviewPlots={this.state.reviewPlots}
                        showGeoDash={this.showGeoDash}
                        goToFirstPlot={this.goToFirstPlot}
                        goToPlot={this.goToPlot}
                        nextPlot={this.nextPlot}
                        prevPlot={this.prevPlot}
                        setReviewPlots={this.setReviewPlots}
                        loadingPlots={this.state.plotList.length === 0}
                        KMLFeatures={this.state.KMLFeatures}
                        zoomMapToPlot={() => mercator.zoomMapToLayer(this.state.mapConfig, "currentPlot")}
                        projectOptions={this.state.currentProject.projectOptions}
                        currentPlot={this.state.currentPlot}
                        currentProject={this.state.currentProject}
                    />
                    {this.state.currentPlot && this.state.currentProject.projectOptions.showPlotInformation &&
                        <PlotInformation extraPlotInfo={this.state.currentPlot.extraPlotInfo}/>
                    }
                    <ImageryOptions
                        baseMapSource={this.state.currentImagery.id}
                        imageryTitle={this.state.currentImagery.title}
                        imageryType={this.state.currentImagery.sourceConfig.type}
                        imageryList={this.state.imageryList}
                        imageryYearDG={this.state.imageryYearDG}
                        imageryYearPlanet={this.state.imageryYearPlanet}
                        imageryMonthPlanet={this.state.imageryMonthPlanet}
                        imageryMonthNamePlanet={this.state.imageryMonthNamePlanet}
                        imageryStartDatePlanetDaily={this.state.imageryStartDatePlanetDaily}
                        imageryEndDatePlanetDaily={this.state.imageryEndDatePlanetDaily}
                        imageryMonthSentinel1={this.state.imageryMonthSentinel1}
                        imageryYearSentinel1={this.state.imageryYearSentinel1}
                        bandCombinationSentinel1={this.state.bandCombinationSentinel1}
                        imageryMonthSentinel2={this.state.imageryMonthSentinel2}
                        imageryYearSentinel2={this.state.imageryYearSentinel2}
                        bandCombinationSentinel2={this.state.bandCombinationSentinel2}
                        setImageryMonthSentinel={this.setImageryMonthSentinel}
                        setImageryYearSentinel={this.setImageryYearSentinel}
                        setBandCombinationSentinel={this.setBandCombinationSentinel}
                        showPlanetDaily={this.state.currentPlot != null}
                        stackingProfileDG={this.state.stackingProfileDG}
                        setBaseMapSource={this.setBaseMapSource}
                        setImageryYearDG={this.setImageryYearDG}
                        setImageryYearPlanet={this.setImageryYearPlanet}
                        setImageryMonthPlanet={this.setImageryMonthPlanet}
                        setImageryDatePlanetDaily={this.setImageryDatePlanetDaily}
                        imagerySecureWatchAvailableDates={this.state.imagerySecureWatchAvailableDates}
                        onChangeSecureWatchSingleLayer={this.onChangeSecureWatchSingleLayer}
                        geeImageryVisParams={this.state.geeImageryVisParams}
                        setGEEImageryVisParams={this.setGEEImageryVisParams}
                        updateGEEImagery={this.updateGEEImagery}
                        geeImageCollectionVisParams={this.state.geeImageCollectionVisParams}
                        geeImageCollectionStartDate={this.state.geeImageCollectionStartDate}
                        geeImageCollectionEndDate={this.state.geeImageCollectionEndDate}
                        setGEEImageCollectionVisParams={this.setGEEImageCollectionVisParams}
                        setGEEImageCollectionStartDate={this.setGEEImageCollectionStartDate}
                        setGEEImageCollectionEndDate={this.setGEEImageCollectionEndDate}
                        updateGEEImageCollection={this.updateGEEImageCollection}
                        setStackingProfileDG={this.setStackingProfileDG}
                        loadingImages={this.state.imageryList.length === 0}
                    />
                    {this.state.currentPlot
                        ?
                            <>
                                {this.unansweredColor()}
                                <SurveyCollection
                                    selectedQuestion={this.state.selectedQuestion}
                                    surveyQuestions={this.state.currentProject.surveyQuestions}
                                    surveyRules={this.state.currentProject.surveyRules}
                                    setCurrentValue={this.setCurrentValue}
                                    setSelectedQuestion={this.setSelectedQuestion}
                                    selectedSampleId={Object.keys(this.state.userSamples).length === 1
                                        ? parseInt(Object.keys(this.state.userSamples)[0])
                                        : this.state.selectedSampleId}
                                />
                            </>
                        :
                            <fieldset className="mb-3 justify-content-center text-center">
                                <h3>Survey Questions</h3>
                                <p>Please go to a plot to see survey questions</p>
                            </fieldset>
                    }
                </SideBar>
                {this.state.showQuitModal &&
                    <QuitMenu
                        documentRoot={this.props.documentRoot}
                        userId={this.props.userId}
                        projectId={this.props.projectId}
                        toggleQuitModal={this.toggleQuitModal}
                    />
                }
                {this.state.plotList.length === 0 &&
                    <div id="spinner" style={{ top: "45%", left: "38%" }}/>
                }
            </div>
        );
    }
}

function ImageAnalysisPane(props) {
    return (
        // Mercator hooks into image-analysis-pane
        <div id="image-analysis-pane" className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
            {props.loader ? <div id="spinner" style={{ top: "45%", zIndex: "5000", visibility: "visible" }}></div> : null }
            <div id="imagery-info" className="row">
                <p className="col small" style={{ transform: "translateY(25%)" }}>{ props.imageryAttribution }</p>
            </div>
            {props.plotId &&
                <div id="download-kml" className="row">
                    <a
                        className="col"
                        style={{ color: "white", fontWeight: "bold" }}
                        href={"data:earth.kml+xml application/vnd.google-earth.kmz, "
                        + encodeURIComponent(props.KMLFeatures)}
                        download={"ceo_" + props.projectId + "_" + props.plotId + ".kml"}
                    >
                        Download Plot KML
                    </a>
                </div>
            }
        </div>
    );
}

function SideBar(props) {
    const saveValuesButtonEnabled = props.surveyQuestions
        .every(sq => sq.visible && sq.visible.length === sq.answered.length);

    const saveButtonGroup = () => (
        <>
            <input
                id="save-values-button"
                className="btn btn-outline-lightgreen btn-sm btn-block"
                type="button"
                name="save-values"
                value="Save"
                onClick={props.postValuesToDB}
                style={{ opacity: saveValuesButtonEnabled ? "1.0" : ".25" }}
                disabled={!saveValuesButtonEnabled}
            />
            <div className="my-2 d-flex justify-content-between">
                <input
                    id="save-values-button"
                    className="btn btn-outline-danger btn-sm col mr-1"
                    type="button"
                    name="save-values"
                    value="Flag Plot"
                    onClick={props.flagPlotInDB}
                    disabled={props.isFlagged}
                />
                <input
                    id="save-values-button"
                    className="btn btn-outline-danger btn-sm col"
                    type="button"
                    name="save-values"
                    value={props.isAnalyzed ? "Clear Changes" : "Clear All"}
                    onClick={props.clearAnswers}
                />
            </div>
        </>
    );

    return (
        <div id="sidebar" className="col-xl-3 border-left full-height" style={{ overflowY: "scroll", overflowX: "hidden" }}>
            <ProjectTitle
                documentRoot={props.documentRoot}
                projectId={props.projectId}
                plotId={props.plotId}
                userName={props.userName}
                projectName={props.projectName || ""}
            />
            {props.children}

            <div className="row">
                <div className="col-sm-12 btn-block">
                    {props.plotId && saveButtonGroup()}
                    <button
                        id="collection-quit-button"
                        className="btn btn-outline-danger btn-block btn-sm mb-4"
                        type="button"
                        name="collection-quit"
                        onClick={props.toggleQuitModal}
                    >
                        Quit
                    </button>
                </div>
            </div>
        </div>
    );
}

function CollapsibleTitle({ title, showGroup, toggleShow }) {
    const buttonDownStyle = { width: "1.5rem", height: "1.5rem", paddingTop: "1px", paddingLeft: "3px" };
    const buttonRightStyle = { width: "1.5rem", height: "1.5rem", paddingTop: "0px", paddingLeft: "6px", fontSize: ".8rem" };
    return (
        <div className="PlotNavigation__Title row">
            <h3
                className="ml-3 btn btn-sm btn-outline-darkgray"
                style={showGroup ? buttonDownStyle : buttonRightStyle}
                onClick={toggleShow}
            >
                {showGroup ? <UnicodeIcon icon="downCaret"/> : <UnicodeIcon icon="rightCaret"/>}
            </h3>
            <h3 className="ml-2">{title}</h3>
        </div>
    );
}

class PlotNavigation extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newPlotInput: "",
            showNav: true,
            auxWindow: null,
        };
    }

    componentDidUpdate(prevProps) {
        if (this.props.plotId !== prevProps.plotId) {
            this.setState({ newPlotInput: this.props.plotId });
        }
    }

    updateNewPlotId = (value) => this.setState({ newPlotInput: value });

    gotoButton = () => (
        <div className="PlotNavigation__first row" id="go-to-first-plot">
            <div className="col">
                <input
                    id="go-to-first-plot-button"
                    className="btn btn-outline-lightgreen btn-sm btn-block"
                    type="button"
                    name="new-plot"
                    value="Go to first plot"
                    onClick={() => {
                        this.setState({ showNav: false });
                        this.props.goToFirstPlot();
                    }}
                />
            </div>
        </div>
    );

    navButtons = () => (
        <div className="PlotNavigation__nav-buttons row justify-content-center" id="plot-nav">
            <button
                className="btn btn-outline-lightgreen"
                type="button"
                onClick={this.props.prevPlot}
                style={{ opacity: this.props.prevPlotButtonDisabled ? "0.25" : "1.0" }}
                disabled={this.props.prevPlotButtonDisabled}
            >
                <UnicodeIcon icon="leftCaret"/>
            </button>
            <button
                className="btn btn-outline-lightgreen mx-1"
                type="button"
                onClick={this.props.nextPlot}
                style={{ opacity: this.props.nextPlotButtonDisabled ? "0.25" : "1.0" }}
                disabled={this.props.nextPlotButtonDisabled}
            >
                <UnicodeIcon icon="rightCaret"/>
            </button>
            <input
                type="text"
                id="plotId"
                autoComplete="off"
                className="col-4 px-0 ml-2 mr-1"
                value={this.state.newPlotInput}
                onChange={e => this.updateNewPlotId(e.target.value)}
            />
            <button
                className="btn btn-outline-lightgreen"
                type="button"
                onClick={() => this.props.goToPlot(this.state.newPlotInput)}
            >
                Go to plot
            </button>
        </div>
    );

    geoButtons = () => (
        <div className="PlotNavigation__geo-buttons d-flex justify-content-between my-2" id="plot-nav">
            <input
                className="btn btn-outline-lightgreen btn-sm col-6 mr-1"
                type="button"
                value="Re-Zoom"
                onClick={this.props.zoomMapToPlot}
            />
            <input
                className="btn btn-outline-lightgreen btn-sm col-6"
                type="button"
                value="Geodash"
                onClick={this.props.showGeoDash}
            />
        </div>
    );

    loadGEEScript = () => {
        const urlParams = this.props.currentPlot.geom ? "geoJson=" + this.props.currentPlot.geom
            : this.props.currentProject.plotShape === "circle"
                    ? "center=["
                    + mercator.parseGeoJson(this.props.currentPlot.center).getCoordinates()
                    + "];radius=" + this.props.currentProject.plotSize / 2
            : "geoJson=" + mercator.geometryToGeoJSON(
                mercator.getPlotPolygon(
                    this.props.currentPlot.center,
                    this.props.currentProject.plotSize,
                    this.props.currentProject.plotShape
                ),
                "EPSG:4326",
                "EPSG:3857",
                5
            );
        if (this.state.auxWindow) this.state.auxWindow.close();
        this.setState({
            auxWindow: window.open("https://billyz313.users.earthengine.app/view/ceoplotancillary#" + urlParams,
                                   "_ceo-plot-ancillary"),
        });
    };

    geeButton = () => (
        <input
            className="btn btn-outline-lightgreen btn-sm btn-block my-2"
            type="button"
            value="Go to GEE Script"
            onClick={this.loadGEEScript}
        />
    );

    render() {
        const { props } = this;
        return (
            <div className="text-center mt-2">
                <CollapsibleTitle
                    title={`Plot Navigation ${this.props.plotId ? `- ID: ${this.props.plotId}` : ""}`}
                    showGroup={this.state.showNav}
                    toggleShow={() => this.setState({ showNav: !this.state.showNav })}
                />
                {props.loadingPlots && <h3>Loading plot data...</h3>}
                {this.state.showNav && !props.loadingPlots &&
                    <Fragment>
                        {!props.navButtonsShown ? this.gotoButton() : this.navButtons()}
                        <div className="PlotNavigation__review-option row justify-content-center mb-3">
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    checked={props.reviewPlots}
                                    id="reviewCheck"
                                    onChange={props.setReviewPlots}
                                    type="checkbox"
                                />
                                <label htmlFor="reviewCheck" className="form-check-label">Review your analyzed plots</label>
                            </div>
                        </div>
                        {props.plotId && this.geoButtons()}
                        {props.plotId
                            && props.projectOptions.hasOwnProperty("showGEEScript")
                            && props.projectOptions.showGEEScript && this.geeButton()}
                    </Fragment>
                }
            </div>
        );
    }
}

class PlotInformation extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showInfo: false,
        };
    }

    render() {
        const hasExtraInfo = Object.values(this.props.extraPlotInfo)
            .filter(value => value && !(value instanceof Object)).length > 0;
        return (
            <>
                <CollapsibleTitle
                    title="Plot Information"
                    showGroup={this.state.showInfo}
                    toggleShow={() => this.setState({ showInfo: !this.state.showInfo })}
                />
                {this.state.showInfo
                    ? hasExtraInfo
                        ?
                            <ul className="mb-3">
                                {Object.entries(this.props.extraPlotInfo)
                                    .filter(([key, value]) => value && !(value instanceof Object))
                                    .map(([key, value]) => <li key={key}>{key} - {value}</li>)}
                            </ul>
                        :
                            <div className="mb-3">There is no extra information for this plot.</div>
                    : null
                }
            </>
        );
    }

}

class ImageryOptions extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showImg: true,
        };
    }

    planetMenus = () => (
        <div className="PlanetsMenu my-2">
            <div className="slidecontainer form-control form-control-sm">
                <input
                    type="range"
                    min="2016"
                    max={new Date().getFullYear()}
                    value={this.props.imageryYearPlanet}
                    className="slider"
                    id="myRange"
                    onChange={e => this.props.setImageryYearPlanet(parseInt(e.target.value))}
                />
                <p>Year: <span id="demo">{this.props.imageryYearPlanet}</span></p>
            </div>
            <div className="slidecontainer form-control form-control-sm">
                <input
                    type="range"
                    min="1"
                    max="12"
                    value={this.props.imageryMonthPlanet}
                    className="slider"
                    id="myRangemonth"
                    onChange={e => this.props.setImageryMonthPlanet(parseInt(e.target.value))}
                />
                <p>Month: <span id="demo">{this.props.imageryMonthNamePlanet}</span></p>
            </div>
        </div>
    );

    planetDailyMenus = () => (
        <div className="PlanetsDailyMenu my-2">
            <label>Start Date</label>
            <div className="slidecontainer form-control form-control-sm">
                <input
                    type="date"
                    id="planetDailyStartDate"
                    value={this.props.imageryStartDatePlanetDaily}
                    max={new Date().toJSON().split("T")[0]}
                    min="2010-01-01"
                    style={{ width: "100%" }}
                    onChange={e => this.props.setImageryDatePlanetDaily(e.target)}
                />
            </div>
            <label>End Date</label>
            <div className="slidecontainer form-control form-control-sm">
                <input
                    type="date"
                    id="planetDailyEndDate"
                    value={this.props.imageryEndDatePlanetDaily}
                    max={new Date().toJSON().split("T")[0]}
                    min="2010-01-01"
                    style={{ width: "100%" }}
                    onChange={e => this.props.setImageryDatePlanetDaily(e.target)}
                />
            </div>
        </div>
    );

    secureWatchMenus = () => (
        <div className="SecureWatchMenu my-2 mb-3">
            <div className="form-control form-control-sm">
                <label>Available Layers</label>
                {this.props.imagerySecureWatchAvailableDates && this.props.imagerySecureWatchAvailableDates.length > 0
                    ?
                        <select
                            className="form-control form-control-sm"
                            onChange={e => this.props.onChangeSecureWatchSingleLayer(e.target)}
                            id="securewatch-option-select"
                        >
                            {this.props.imagerySecureWatchAvailableDates.map((obj, uid) =>
                                <option key={uid} value={obj.featureId} date={obj.acquisitionDate} cloud={obj.cloudCover}>
                                    {obj.acquisitionDate + " (" + (obj.cloudCover * 100).toFixed(2) + "% cloudy)"}
                                </option>
                            )}
                        </select>
                    :
                        <select
                            className="form-control form-control-sm"
                            id="securewatch-option-select"
                            disabled
                        >
                            <option>
                                {this.props.imagerySecureWatchAvailableDates
                                        ? "No available layers"
                                        : "Loading dates..."
                                }
                            </option>
                        </select>
                }
            </div>
        </div>
    );

    sentinel1Menus = () => {
        const bandCombinationOptions = [
            { label: "VH,VV,VH/VV", value: "VH,VV,VH/VV" },
            { label: "VH,VV,VV/VH", value: "VH,VV,VV/VH" },
            { label: "VV,VH,VV/VH", value: "VV,VH,VV/VH" },
            { label: "VV,VH,VH/VV", value: "VV,VH,VH/VV" },
        ];

        return (
            <div className="Sentinel1Menu my-2">
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="range"
                        min="2014"
                        max={new Date().getFullYear()}
                        value={this.props.imageryYearSentinel1}
                        className="slider"
                        id="sentinel1-year"
                        onChange={e => this.props.setImageryYearSentinel(e.target)}
                    />
                    <p>Year: <span>{this.props.imageryYearSentinel1}</span></p>
                </div>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="range"
                        min="1"
                        max="12"
                        value={this.props.imageryMonthSentinel1}
                        className="slider"
                        id="sentinel1-month"
                        onChange={e => this.props.setImageryMonthSentinel(e.target)}
                    />
                    <p>Month: <span id="demo">{this.props.imageryMonthSentinel1}</span></p>
                </div>
                <div className="form-control form-control-sm" >
                    <div className="mb-3">
                        <label>Band Combination</label>
                        <select
                            className="form-control"
                            id="sentinel1-bandCombination"
                            onChange={e => this.props.setBandCombinationSentinel(e.target)}
                            value={this.props.bandCombinationSentinel1}
                        >
                            {bandCombinationOptions.map(el => <option value={el.value} key={el.value}>{el.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        );
    };

    sentinel2Menus = () => {
        const bandCombinationOptions = [
            { label: "True Color", value: "TrueColor" },
            { label: "False Color Infrared", value: "FalseColorInfrared" },
            { label: "False Color Urban", value: "FalseColorUrban" },
            { label: "Agriculture", value: "Agriculture" },
            { label: "Healthy Vegetation", value: "HealthyVegetation" },
            { label: "Short Wave Infrared", value: "ShortWaveInfrared" },
        ];

        return (
            <div className="Sentinel2Menu my-2">
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="range"
                        min="2015"
                        max={new Date().getFullYear()}
                        value={this.props.imageryYearSentinel2}
                        className="slider"
                        id="sentinel2-year"
                        onChange={e => this.props.setImageryYearSentinel(e.target)}
                    />
                    <p>Year: <span>{this.props.imageryYearSentinel2}</span></p>
                </div>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="range"
                        min="1"
                        max="12"
                        value={this.props.imageryMonthSentinel2}
                        className="slider"
                        id="sentinel2-month"
                        onChange={e => this.props.setImageryMonthSentinel(e.target)}
                    />
                    <p>Month: <span id="demo">{this.props.imageryMonthSentinel2}</span></p>
                </div>
                <div className="form-control form-control-sm" >
                    <div className="mb-3">
                        <label>Band Combination</label>
                        <select
                            className="form-control"
                            id="sentinel2-bandCombination"
                            onChange={e => this.props.setBandCombinationSentinel(e.target)}
                            value={this.props.bandCombinationSentinel2}
                        >
                            {bandCombinationOptions.map(el => <option value={el.value} key={el.value}>{el.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        );
    };

    GEEImageMenus = () => (
        <div className="GEEImageMenu my-2">
            <div className="form-control form-control-sm">
                <label>Visualization Parameters</label>
                <textarea
                    className="form-control"
                    id="geeImageVisParams"
                    value={this.props.geeImageryVisParams}
                    onChange={e => this.props.setGEEImageryVisParams(e.target.value)}
                >
                    {this.props.geeImageryVisParams}
                </textarea>
                <br />
                <button
                    type="button"
                    className="btn bg-lightgreen btn-sm btn-block"
                    id="update-gee-image-button"
                    onClick={this.props.updateGEEImagery}
                >
                    Update Image
                </button>
            </div>
        </div>
    );

    GEEImageCollectionMenus = () => (
        <div className="GEEImageCollectionMenu my-2">
            <div className="form-control form-control-sm">
                <label>Start Date</label>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="date"
                        id="geeImageCollectionStartDate"
                        value={this.props.geeImageCollectionStartDate}
                        max={new Date().toJSON().split("T")[0]}
                        style={{ width: "100%" }}
                        onChange={e => this.props.setGEEImageCollectionStartDate(e.target.value)}
                    />
                </div>
                <label>End Date</label>
                <div className="slidecontainer form-control form-control-sm">
                    <input
                        type="date"
                        id="geeImageCollectionEndDate"
                        value={this.props.geeImageCollectionEndDate}
                        max={new Date().toJSON().split("T")[0]}
                        style={{ width: "100%" }}
                        onChange={e => this.props.setGEEImageCollectionEndDate(e.target.value)}
                    />
                </div>
                <label>Visualization Parameters</label>
                <textarea
                    className="form-control"
                    id="geeImageCollectionVisParams"
                    value={this.props.geeImageCollectionVisParams}
                    onChange={e => this.props.setGEEImageCollectionVisParams(e.target.value)}
                >
                    {this.props.geeImageCollectionVisParams}
                </textarea>
                <br />
                <button
                    type="button"
                    className="btn bg-lightgreen btn-sm btn-block"
                    id="update-gee-image-button"
                    onClick={this.props.updateGEEImageCollection}
                >
                    Update Image
                </button>
            </div>
        </div>
    );

    render() {
        const { props } = this;
        return (
            <div className="justify-content-center text-center">
                <CollapsibleTitle
                    title="Imagery Options"
                    showGroup={this.state.showImg}
                    toggleShow={() => this.setState({ showImg: !this.state.showImg })}
                />
                {props.loadingImages && <h3>Loading imagery data...</h3>}
                {(this.state.showImg && !props.loadingImages) &&
                    <Fragment>
                        <select
                            className="form-control form-control-sm"
                            id="base-map-source"
                            name="base-map-source"
                            size="1"
                            value={props.baseMapSource || ""}
                            onChange={e => props.setBaseMapSource(parseInt(e.target.value))}
                        >
                            {
                                props.showPlanetDaily
                                    ? props.imageryList.map(
                                        (imagery, uid) =>
                                            <option key={uid} value={imagery.id}>{imagery.title}</option>
                                    )
                                    : props.imageryList.filter(layerConfig => layerConfig.sourceConfig.type !== "PlanetDaily")
                                        .map(
                                            (imagery, uid) =>
                                                <option key={uid} value={imagery.id}>{imagery.title}</option>
                                        )
                            }
                        </select>
                        {props.imageryType === "Planet" && this.planetMenus()}
                        {props.imageryType === "PlanetDaily" && this.planetDailyMenus()}
                        {props.imageryType === "SecureWatch" && this.secureWatchMenus()}
                        {props.imageryType === "Sentinel1" && this.sentinel1Menus()}
                        {props.imageryType === "Sentinel2" && this.sentinel2Menus()}
                        {props.imageryType === "GEEImage" && this.GEEImageMenus()}
                        {props.imageryType === "GEEImageCollection" && this.GEEImageCollectionMenus()}
                    </Fragment>
                }
            </div>
        );
    }
}

class ProjectTitle extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showStats: false,
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.plotId !== this.props.plotId) {
            this.setState({ showStats: false });
        }
    }

    render() {
        const { props } = this;
        return (
            <div style={{ height: "3rem", cursor: "default" }} onClick={() => this.setState({ showStats: !this.state.showStats })}>
                <h2
                    className="header overflow-hidden text-truncate"
                    title={props.projectName}
                    style={{ height: "100%", marginBottom: "0" }}
                >
                    <UnicodeIcon icon="downCaret"/>{" " + props.projectName}
                </h2>
                {this.state.showStats &&
                <ProjectStats
                    documentRoot={this.props.documentRoot}
                    projectId={this.props.projectId}
                    userName={this.props.userName}
                />
                }
            </div>
        );
    }
}

class ProjectStats extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stats: {},
        };
    }

    componentDidMount() {
        this.getProjectStats();
    }

    asPercentage(part, total) {
        return (part && total)
            ? (100.0 * part / total).toFixed(2)
            : "0.00";
    }

    getProjectStats() {
        fetch(this.props.documentRoot + "/get-project-stats?projectId=" + this.props.projectId)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ stats: data }))
            .catch(response => {
                console.log(response);
                alert("Error getting project stats. See console for details.");
            });
    }

    render() {
        const { stats } = this.state;
        const userStats = stats.userStats && stats.userStats.find(user => user.user === this.props.userName);
        const numPlots = stats.flaggedPlots + stats.analyzedPlots + stats.unanalyzedPlots;
        return (
            <div
                className="row"
                style={{
                    backgroundColor: "#f1f1f1",
                    boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
                    cursor: "default",
                    marginLeft: "2rem",
                    overflow: "auto",
                    position: "absolute",
                    zIndex: "10",
                }}
            >
                <div className="col-lg-12">
                    <fieldset id="projStats" className="projNoStats">
                        <table className="table table-sm">
                            <tbody>
                                <tr>
                                    <td className="small pl-4">My Plots Completed</td>
                                    <td className="small">
                                        {userStats && userStats.plots || "0"}
                                        ({this.asPercentage(userStats && userStats.plots || 0, numPlots)}%)
                                    </td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">-- My Average Time</td>
                                    <td className="small">
                                        {userStats && userStats.timedPlots ? `${(userStats.seconds / userStats.timedPlots / 1.0).toFixed(2)} secs` : "untimed"}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">Project Plots Completed</td>
                                    <td className="small">
                                        {stats.analyzedPlots + stats.flaggedPlots || ""}
                                        ({this.asPercentage(stats.analyzedPlots + stats.flaggedPlots, numPlots)}%)
                                    </td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">-- Analyzed</td>
                                    <td className="small">
                                        {stats.analyzedPlots || ""}
                                        ({this.asPercentage(stats.analyzedPlots, numPlots)}%)
                                    </td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">-- Flagged</td>
                                    <td className="small">
                                        {stats.flaggedPlots || ""}
                                        ({this.asPercentage(stats.flaggedPlots, numPlots)}%)
                                    </td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">-- Total contributors</td>
                                    <td className="small">
                                        {stats.userStats ? stats.userStats.length : 0}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">-- Users Average time</td>
                                    <td className="small">
                                        {stats.userStats && stats.userStats.reduce((p, c) => p + c.timedPlots, 0) > 0
                                            ? `${(stats.userStats.reduce((p, c) => p + c.seconds, 0)
                                                    / stats.userStats.reduce((p, c) => p + c.timedPlots, 0)
                                                    / 1.0).toFixed(2)} secs`
                                        : "untimed"}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">Project Plots Total</td>
                                    <td className="small">
                                        {numPlots || ""}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </fieldset>
                </div>
            </div>
        );
    }
}

// remains hidden, shows a styled menu when the quit button is clicked
function QuitMenu({ userId, projectId, documentRoot, toggleQuitModal }) {
    return (
        <div
            className="modal fade show"
            style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            id="quitModal"
            onClick={toggleQuitModal}
        >
            <div
                className="modal-dialog modal-dialog-centered"
                role="document"
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-content" id="quitModalContent">
                    <div className="modal-header">
                        <h5 className="modal-title" id="quitModalTitle">Confirmation</h5>
                        <button
                            type="button"
                            className="close"
                            aria-label="Close"
                            onClick={toggleQuitModal}
                        >
                            &times;
                        </button>
                    </div>
                    <div className="modal-body">
                        Are you sure you want to stop collecting data?
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={toggleQuitModal}
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            className="btn bg-lightgreen btn-sm"
                            id="quit-button"
                            onClick={() =>
                                fetch(
                                    documentRoot + "/release-plot-locks?userId=" + userId + "&projectId=" + projectId,
                                    { method: "POST" }
                                )
                                    .then(() => window.location = documentRoot + "/home")
                            }
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function renderCollectionPage(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <Collection
                documentRoot=""
                userId={args.userId === "" ? -1 : parseInt(args.userId)}
                userName={args.userName}
                projectId={args.projectId}
            />
        </NavigationBar>,
        document.getElementById("collection")
    );
}
