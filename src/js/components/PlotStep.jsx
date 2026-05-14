import React, { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { projectImageryListAtom } from '../state/projectWizard';
import { mapImageryLibraryAtom, activeMapLayerIdsAtom } from '../state/map';
import { NewMap } from './NewMap';
import SvgIcon from './svg/SvgIcon';
